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

async function readGoogleError(response) {
  const text = await response.text().catch(() => "");

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function deleteGoogleCalendarEvent(accessToken, googleEventId) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      googleEventId
    )}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: null,
    };
  }

  const data = await readGoogleError(response);

  return {
    ok: false,
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

    if (!googleEventId) {
      return NextResponse.json(
        { error: "Missing googleEventId." },
        { status: 400 }
      );
    }

    let { accessToken, refreshToken } = await getValidGoogleTokens(
      supabase,
      user.id
    );

    let googleResult = await deleteGoogleCalendarEvent(
      accessToken,
      googleEventId
    );

    if (googleResult.status === 404) {
      return NextResponse.json({
        success: true,
        alreadyDeleted: true,
      });
    }

    if (!googleResult.ok && googleResult.status === 401 && refreshToken) {
      try {
        const refreshed = await refreshGoogleAccessToken(refreshToken);
        accessToken = refreshed.accessToken;

        await saveRefreshedAccessToken(supabase, user.id, refreshed);

        googleResult = await deleteGoogleCalendarEvent(
          accessToken,
          googleEventId
        );
      } catch (retryRefreshError) {
        console.error(
          "Google Calendar delete retry refresh failed:",
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

    if (googleResult.status === 404) {
      return NextResponse.json({
        success: true,
        alreadyDeleted: true,
      });
    }

    if (!googleResult.ok) {
      console.error("Google Calendar event delete failed:", googleResult.data);

      if (isGooglePermissionProblem(googleResult.status)) {
        await markGoogleCalendarDisconnected(supabase, user.id);

        return NextResponse.json(
          {
            error: "Google Calendar reconnect required. Permission problem.",
            google: googleResult.data,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to delete Google Calendar event.",
          google: googleResult.data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete Google Calendar event route failed:", error);

    return NextResponse.json(
      { error: error.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}