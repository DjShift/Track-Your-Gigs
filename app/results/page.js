"use client";

import { useEffect, useState } from "react";
import TopNav from "../../components/TopNav";
import MonthlyResults from "../../components/MonthlyResults";

export default function ResultsPage() {
  const [mounted, setMounted] = useState(false);
  const [gigs, setGigs] = useState([]);

  useEffect(() => {
    try {
      const savedGigs = localStorage.getItem("dj-gigs");
      if (savedGigs) {
        setGigs(JSON.parse(savedGigs));
      }
    } catch (error) {
      console.error("Failed to load gigs from localStorage:", error);
    }

    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <TopNav />

        <h1 className="text-4xl font-bold mb-2">Results</h1>
        <p className="text-zinc-400 mb-8">
          Monthly overview of your economic results.
        </p>

        {!mounted ? (
          <p className="text-zinc-500">Loading results...</p>
        ) : (
          <MonthlyResults gigs={gigs} />
        )}
      </div>
    </main>
  );
}