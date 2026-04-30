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

async function checkGoogleCalendarPermission(accessToken) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          connected: false,
          status: "not_authenticated",
          error: "User not authenticated.",
        },
        { status: 401 }
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select(
        "google_calendar_connected, google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry, google_calendar_email"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error("Failed to load Google Calendar settings:", settingsError);

      return NextResponse.json(
        {
          connected: false,
          status: "settings_error",
          error: "Failed to load Google Calendar settings.",
        },
        { status: 500 }
      );
    }

    const isMarkedConnected = Boolean(settings?.google_calendar_connected);
    let accessToken = settings?.google_calendar_access_token || "";
    const refreshToken = settings?.google_calendar_refresh_token || "";

    const tokenExpiry = settings?.google_calendar_token_expiry
      ? new Date(settings.google_calendar_token_expiry).getTime()
      : 0;

    if (!isMarkedConnected) {
      return NextResponse.json({
        connected: false,
        status: "not_connected",
        email: settings?.google_calendar_email || "",
      });
    }

    if (!refreshToken) {
      await markGoogleCalendarDisconnected(supabase, user.id);

      return NextResponse.json({
        connected: false,
        status: "needs_reconnect",
        error: "Missing Google refresh token.",
        email: settings?.google_calendar_email || "",
      });
    }

    const now = Date.now();
    const needsRefresh =
      !accessToken || !tokenExpiry || tokenExpiry <= now + 60_000;

    if (needsRefresh) {
      try {
        const refreshed = await refreshGoogleAccessToken(refreshToken);
        accessToken = refreshed.accessToken;

        await saveRefreshedAccessToken(supabase, user.id, refreshed);
      } catch (refreshError) {
        console.error("Google Calendar status refresh failed:", refreshError);

        await markGoogleCalendarDisconnected(supabase, user.id);

        return NextResponse.json({
          connected: false,
          status: "needs_reconnect",
          error: "Google Calendar token refresh failed.",
          email: settings?.google_calendar_email || "",
        });
      }
    }

    const permissionCheck = await checkGoogleCalendarPermission(accessToken);

    if (!permissionCheck.ok) {
      console.error(
        "Google Calendar permission check failed:",
        permissionCheck.data
      );

      if (permissionCheck.status === 401 || permissionCheck.status === 403) {
        await markGoogleCalendarDisconnected(supabase, user.id);

        return NextResponse.json({
          connected: false,
          status: "needs_reconnect",
          error: "Google Calendar permission check failed.",
          google: permissionCheck.data,
          email: settings?.google_calendar_email || "",
        });
      }

      return NextResponse.json({
        connected: false,
        status: "google_check_failed",
        error: "Could not verify Google Calendar connection.",
        google: permissionCheck.data,
        email: settings?.google_calendar_email || "",
      });
    }

    return NextResponse.json({
      connected: true,
      status: "connected",
      email: settings?.google_calendar_email || "",
      tokenExpiry: settings?.google_calendar_token_expiry || null,
      hasRefreshToken: true,
      hasAccessToken: Boolean(accessToken),
    });
  } catch (error) {
    console.error("Google Calendar status route failed:", error);

    return NextResponse.json(
      {
        connected: false,
        status: "server_error",
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}