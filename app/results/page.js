"use client";

import { useEffect, useState } from "react";
import TopNav from "../../components/TopNav";
import MonthlyResults from "../../components/MonthlyResults";
import { loadGigs } from "../../utils/supabase/gigs";

export default function ResultsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState([]);

  useEffect(() => {
    async function loadResultsData() {
      try {
        const gigsData = await loadGigs();
        setGigs(gigsData);
      } catch (error) {
        console.error("Failed to load gigs for results:", error);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    }

    loadResultsData();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <TopNav />

        <h1 className="text-4xl font-bold mb-2">Results</h1>
        <p className="text-zinc-400 mb-8">
          Monthly overview of your economic results.
        </p>

        {!mounted || loading ? (
          <p className="text-zinc-500">Loading results...</p>
        ) : (
          <MonthlyResults gigs={gigs} />
        )}
      </div>
    </main>
  );
}