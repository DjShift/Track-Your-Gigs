import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "../../../../utils/supabase/server";

async function refreshGoogleAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth environment variables.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    const error = new Error(
      data?.error_description ||
        data?.error ||
        "Failed to refresh Google access token."
    );

    error.status = response.status;
    error.google = data;

    throw error;
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in || 0),
  };
}

async function saveRefreshedAccessToken(supabase, userId, refreshed) {
  const newExpiry =
    refreshed.expiresIn > 0
      ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
      : null;

  await supabase
    .from("settings")
    .update({
      google_calendar_access_token: refreshed.accessToken,
      google_calendar_token_expiry: newExpiry,
      google_calendar_connected: true,
    })
    .eq("user_id", userId);
}

async function markGoogleCalendarDisconnected(supabase, userId) {
  await supabase
    .from("settings")
    .update({
      google_calendar_connected: false,
    })
    .eq("user_id", userId);
}

async function getValidGoogleTokens(supabase, userId) {
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select(
      "google_calendar_connected, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expiry"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (settingsError) {
    throw new Error("Failed to load Google Calendar settings.");
  }

  if (!settings?.google_calendar_connected) {
    throw new Error("Google Calendar is not connected.");
  }

  let accessToken = settings.google_calendar_access_token || "";
  const refreshToken = settings.google_calendar_refresh_token || "";

  const tokenExpiry = settings.google_calendar_token_expiry
    ? new Date(settings.google_calendar_token_expiry).getTime()
    : 0;

  const now = Date.now();
  const needsRefresh =
    !accessToken || !tokenExpiry || tokenExpiry <= now + 60_000;

  if (!needsRefresh) {
    return {
      accessToken,
      refreshToken,
    };
  }

  if (!refreshToken) {
    await markGoogleCalendarDisconnected(supabase, userId);
    throw new Error("Google Calendar reconnect required. Missing refresh token.");
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);
  accessToken = refreshed.accessToken;

  await saveRefreshedAccessToken(supabase, userId, refreshed);

  return {
    accessToken,
    refreshToken,
  };
}

function normalizeTime(value, fallback) {
  if (!value || typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function getTimeZoneOffsetString(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const timeZoneName =
    parts.find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";

  return timeZoneName.replace("GMT", "");
}

function buildRFC3339InTimeZone(dateString, timeString, timeZone) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetString(utcGuess, timeZone);

  return `${dateString}T${timeString}:00${offset}`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function updateGoogleCalendarEvent(accessToken, googleEventId, eventPayload) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      googleEventId
    )}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function isGooglePermissionProblem(status) {
  return status === 401 || status === 403;
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const googleEventId = body?.googleEventId || "";
    const eventDate = body?.eventDate || "";
    const venue = body?.venue || "";
    const city = body?.city || "";
    const notes = body?.notes || "";
    const status = body?.status || "Planned";
    const calendarReminderEnabled = Boolean(body?.calendarReminderEnabled);
    const calendarReminderMinutes = Number(body?.calendarReminderMinutes || 30);

    const startTime = normalizeTime(body?.startTime, "22:00");
    const endTime = normalizeTime(body?.endTime, "04:00");

    if (!googleEventId || !eventDate || !venue) {
      return NextResponse.json(
        { error: "Missing required event update data." },
        { status: 400 }
      );
    }

    let { accessToken, refreshToken } = await getValidGoogleTokens(
      supabase,
      user.id
    );

    const timeZone = "Europe/Bratislava";

    let endDate = eventDate;

    if (endTime <= startTime) {
      const [year, month, day] = eventDate.split("-").map(Number);
      const nextDay = new Date(year, month - 1, day);
      nextDay.setDate(nextDay.getDate() + 1);
      endDate = formatLocalDate(nextDay);
    }

    const startDateTime = buildRFC3339InTimeZone(
      eventDate,
      startTime,
      timeZone
    );

    const endDateTime = buildRFC3339InTimeZone(endDate, endTime, timeZone);

    const eventPayload = {
      summary:
        status === "Canceled"
          ? `Canceled DJ Gig - ${venue}`
          : `DJ Gig - ${venue}`,
      location: city || "",
      description: [
        city ? `City: ${city}` : "",
        status ? `Status: ${status}` : "",
        notes ? `Notes: ${notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: calendarReminderEnabled
          ? [
              {
                method: "popup",
                minutes: calendarReminderMinutes,
              },
            ]
          : [],
      },
    };

    let googleResult = await updateGoogleCalendarEvent(
      accessToken,
      googleEventId,
      eventPayload
    );

    if (!googleResult.ok && googleResult.status === 401 && refreshToken) {
      try {
        const refreshed = await refreshGoogleAccessToken(refreshToken);
        accessToken = refreshed.accessToken;

        await saveRefreshedAccessToken(supabase, user.id, refreshed);

        googleResult = await updateGoogleCalendarEvent(
          accessToken,
          googleEventId,
          eventPayload
        );
      } catch (retryRefreshError) {
        console.error(
          "Google Calendar update retry refresh failed:",
          retryRefreshError
        );

        await markGoogleCalendarDisconnected(supabase, user.id);

        return NextResponse.json(
          {
            error: "Google Calendar reconnect required. Token retry failed.",
          },
          { status: 401 }
        );
      }
    }

    if (!googleResult.ok) {
      console.error("Google Calendar event update failed:", googleResult.data);

      if (isGooglePermissionProblem(googleResult.status)) {
        await markGoogleCalendarDisconnected(supabase, user.id);

        return NextResponse.json(
          {
            error: "Google Calendar reconnect required. Permission problem.",
            google: googleResult.data,
            debug: {
              googleEventId,
              eventDate,
              startTime,
              endTime,
              startDateTime,
              endDateTime,
            },
          },
          { status: 403 }
        );
      }

      if (googleResult.status === 404) {
        return NextResponse.json(
          {
            error:
              "Google Calendar event was not found. It may have been deleted manually.",
            google: googleResult.data,
            debug: {
              googleEventId,
              eventDate,
              startTime,
              endTime,
              startDateTime,
              endDateTime,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to update Google Calendar event.",
          google: googleResult.data,
          debug: {
            googleEventId,
            eventDate,
            startTime,
            endTime,
            startDateTime,
            endDateTime,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: googleResult.data?.id,
      htmlLink: googleResult.data?.htmlLink,
    });
  } catch (error) {
    console.error("Update Google Calendar event route failed:", error);

    return NextResponse.json(
      { error: error.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}