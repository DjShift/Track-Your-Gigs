"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setLoadingAction("login");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Login failed.");
        setLoadingAction("");
        return;
      }

      if (!data?.session) {
        setErrorMessage("Login failed. No session was created.");
        setLoadingAction("");
        return;
      }

      window.location.href = "/calendar";
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("Unexpected login error.");
      setLoadingAction("");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setLoadingAction("register");

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_SITE_URL ||
            "https://djgigtracker.vercel.app/login",
        },
      });

      if (error) {
        setErrorMessage(error.message || "Registration failed.");
        setLoadingAction("");
        return;
      }

      setSuccessMessage(
        "Account created. Check your email and confirm your account."
      );
      setLoadingAction("");
    } catch (error) {
      console.error("Registration failed:", error);
      setErrorMessage("Unexpected registration error.");
      setLoadingAction("");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Track your DJ gigs, income, and results in one place.
          </h1>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full space-y-4"
        >
          <h2 className="text-2xl font-bold">Login</h2>

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 bg-zinc-800 rounded-lg border border-zinc-700 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 bg-zinc-800 rounded-lg border border-zinc-700 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loadingAction !== ""}
            className="w-full bg-white text-black p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loadingAction === "login" ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loadingAction !== ""}
            className="w-full border border-zinc-700 p-3 rounded-lg font-medium disabled:opacity-60"
          >
            {loadingAction === "register" ? "Registering..." : "Register"}
          </button>

          {errorMessage && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="text-sm text-green-400">{successMessage}</p>
          )}
        </form>
      </div>
    </main>
  );
}