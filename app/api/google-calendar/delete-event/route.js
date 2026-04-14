import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "../../../../utils/supabase/server";

async function refreshGoogleAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Failed to refresh Google access token.");
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in || 0),
  };
}

async function getValidAccessToken(supabase, userId) {
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
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error("Missing Google refresh token.");
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);
  accessToken = refreshed.accessToken;

  const newExpiry =
    refreshed.expiresIn > 0
      ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
      : null;

  await supabase
    .from("settings")
    .update({
      google_calendar_access_token: accessToken,
      google_calendar_token_expiry: newExpiry,
    })
    .eq("user_id", userId);

  return accessToken;
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

    const accessToken = await getValidAccessToken(supabase, user.id);

    const googleEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!googleEventResponse.ok) {
      const text = await googleEventResponse.text();
      console.error("Google Calendar event delete failed:", text);

      return NextResponse.json(
        { error: "Failed to delete Google Calendar event.", google: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Google Calendar event route failed:", error);

    return NextResponse.json(
      { error: error.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}