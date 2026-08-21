import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { zipCode, staples, pushSubscription } = body as {
    zipCode: string;
    staples: string[];
    pushSubscription: object;
  };

  if (!zipCode || !staples?.length || !pushSubscription) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { findNearestLocationId } = await import("@/lib/kroger");
  const locationId = await findNearestLocationId(zipCode);

  const { data: watcher, error: watcherError } = await supabase
    .from("watchers")
    .insert({ zip_code: zipCode, location_id: locationId, push_subscription: pushSubscription })
    .select()
    .single();

  if (watcherError) {
    return NextResponse.json({ error: watcherError.message }, { status: 500 });
  }

  const { error: staplesError } = await supabase
    .from("staples")
    .insert(staples.map((term) => ({ watcher_id: watcher.id, search_term: term })));

  if (staplesError) {
    return NextResponse.json({ error: staplesError.message }, { status: 500 });
  }

  return NextResponse.json({ watcherId: watcher.id });
}
