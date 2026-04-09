"use client";

import { useState } from "react";
import TopNav from "../../components/TopNav";
import CalendarGrid from "../../components/CalendarGrid";

export default function CalendarPage() {
  const [gigs, setGigs] = useState(() => {
    if (typeof window === "undefined") return [];

    try {
      const savedGigs = localStorage.getItem("dj-gigs");
      return savedGigs ? JSON.parse(savedGigs) : [];
    } catch {
      return [];
    }
  });

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <TopNav />

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Calendar</h1>
        <p className="text-zinc-400 mb-6 md:mb-8">
          Monthly overview of your gigs.
        </p>

        <CalendarGrid gigs={gigs} setGigs={setGigs} />
      </div>
    </main>
  );
}