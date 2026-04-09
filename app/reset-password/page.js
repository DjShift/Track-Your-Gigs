"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleResetPassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    console.log("RESET EMAIL:", email);
    console.log("RESET ERROR:", error);

    if (error) {
      setErrorMessage(error.message || "Failed to send reset email.");
      setLoading(false);
      return;
    }

    setMessage("Password reset email has been sent.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-2">Reset password</h1>
        <p className="text-zinc-400 mb-6">
          Enter your email and we will send you a reset link.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-white"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white text-black font-semibold py-3 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {message && <p className="text-green-400 text-sm mt-4">{message}</p>}
        {errorMessage && (
          <p className="text-red-400 text-sm mt-4">{errorMessage}</p>
        )}
      </div>
    </main>
  );
}