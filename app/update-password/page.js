"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must have at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message || "Failed to update password.");
      setLoading(false);
      return;
    }

    setSuccessMessage("Password updated successfully.");

    setTimeout(() => {
      router.push("/");
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-2">Set new password</h1>
        <p className="text-zinc-400 mb-6">Enter your new password below.</p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-white"
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-white"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white text-black font-semibold py-3 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>

        {errorMessage && (
          <p className="text-red-400 text-sm mt-4">{errorMessage}</p>
        )}

        {successMessage && (
          <p className="text-green-400 text-sm mt-4">{successMessage}</p>
        )}
      </div>
    </main>
  );
}