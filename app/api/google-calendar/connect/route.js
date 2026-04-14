import { NextResponse } from "next/server";
import crypto from "crypto";
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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!clientId || !siteUrl) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=missing_env", request.url)
      );
    }

    const state = crypto.randomBytes(24).toString("hex");
    const redirectUri = `${siteUrl}/api/google-calendar/callback`;

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      [
        "https://www.googleapis.com/auth/calendar.events",
        "openid",
        "email",
        "profile",
      ].join(" ")
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("google_calendar_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("Google Calendar connect route failed:", error);

    return NextResponse.redirect(
      new URL("/settings?calendar_error=connect_failed", request.url)
    );
  }
}