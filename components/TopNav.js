"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";

export default function TopNav() {
  const supabase = createClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navItemClass =
    "bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm hover:bg-zinc-800 transition";

  return (
    <nav className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/calendar" className={navItemClass}>
            Calendar
          </Link>

          <Link href="/" className={navItemClass}>
            Gigs
          </Link>

          <Link href="/results" className={navItemClass}>
            Results
          </Link>

          <Link href="/settings" className={navItemClass}>
            Settings
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-zinc-400">
                {user.email}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className={navItemClass}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className={navItemClass}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}