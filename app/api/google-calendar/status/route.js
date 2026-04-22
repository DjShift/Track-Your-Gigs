import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "../../../../utils/supabase/server";

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
          error: "User not authenticated.",
        },
        { status: 401 }
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select(
        "google_calendar_connected, google_calendar_refresh_token, google_calendar_access_token, google_calendar_token_expiry"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        {
          connected: false,
          error: "Failed to load Google Calendar settings.",
        },
        { status: 500 }
      );
    }

    const isMarkedConnected = Boolean(settings?.google_calendar_connected);
    const hasRefreshToken = Boolean(settings?.google_calendar_refresh_token);
    const hasAccessToken = Boolean(settings?.google_calendar_access_token);

    return NextResponse.json({
      connected: isMarkedConnected && hasRefreshToken,
      googleCalendarConnected: isMarkedConnected,
      hasRefreshToken,
      hasAccessToken,
      tokenExpiry: settings?.google_calendar_token_expiry || null,
    });
  } catch (error) {
    console.error("Google Calendar status route failed:", error);

    return NextResponse.json(
      {
        connected: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}