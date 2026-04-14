import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "../../../../utils/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=not_logged_in", request.url)
      );
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const storedState =
      request.cookies.get("google_calendar_oauth_state")?.value;

    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=invalid_state", request.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!clientId || !clientSecret || !siteUrl) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=missing_env", request.url)
      );
    }

    const redirectUri = `${siteUrl}/api/google-calendar/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", tokenData);

      return NextResponse.redirect(
        new URL("/settings?calendar_error=token_exchange_failed", request.url)
      );
    }

    const accessToken = tokenData.access_token || "";
    const refreshToken = tokenData.refresh_token || "";
    const expiresIn = Number(tokenData.expires_in || 0);

    let googleEmail = "";

    if (accessToken) {
      const profileResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        googleEmail = profileData.email || "";
      }
    }

    const expiryDate =
      expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

    const { error: upsertError } = await supabase.from("settings").upsert(
      {
        user_id: user.id,
        google_calendar_connected: true,
        google_calendar_email: googleEmail,
        google_calendar_access_token: accessToken,
        google_calendar_refresh_token: refreshToken,
        google_calendar_token_expiry: expiryDate,
      },
      {
        onConflict: "user_id",
      }
    );

    if (upsertError) {
      console.error("Failed to save Google Calendar connection:", upsertError);

      return NextResponse.redirect(
        new URL("/settings?calendar_error=save_failed", request.url)
      );
    }

    const response = NextResponse.redirect(
      new URL("/settings?calendar_success=connected", request.url)
    );

    response.cookies.set("google_calendar_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Google Calendar callback failed:", error);

    return NextResponse.redirect(
      new URL("/settings?calendar_error=callback_failed", request.url)
    );
  }
}