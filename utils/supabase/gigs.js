import { createClient } from "./client";

function getSupabase() {
  return createClient();
}

export function mapGigFromDb(row) {
  return {
    id: row.id,
    clubId: row.club_id ?? null,
    eventDate: row.event_date,
    venue: row.venue,
    city: row.city,
    distance: Number(row.distance ?? 0),
    fee: Number(row.fee ?? 0),
    status: row.status,
    travelCost: Number(row.travel_cost ?? 0),
    extraCosts: Number(row.extra_costs ?? 0),
    extraCostsNote: row.extra_costs_note || "",
    netProfit: Number(row.net_profit ?? 0),
    notes: row.notes || "",
    startTime: row.start_time || "22:00",
    endTime: row.end_time || "04:00",
    durationHours: Number(row.duration_hours ?? 6),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentUserId() {
  const supabase = getSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("User not authenticated.");
  }

  return user.id;
}

export async function loadSavedClubs() {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function loadGigs() {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("gigs")
    .select("*")
    .eq("user_id", userId)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapGigFromDb);
}

export async function loadCostPerKm() {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("settings")
    .select("cost_per_km")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.cost_per_km ?? 0.25);
}

export async function createGig(payload) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("gigs")
    .insert({
      user_id: userId,
      ...payload,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapGigFromDb(data);
}

export async function updateGig(id, payload) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("gigs")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapGigFromDb(data);
}

export async function deleteGigById(id) {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("gigs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return true;
}

export async function updateGigStatus(id, status) {
  return updateGig(id, { status });
}