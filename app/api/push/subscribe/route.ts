import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { zipCode, staples } = body as {
    zipCode: string;
    staples: string[];
  };

  if (!zipCode || !staples?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { findNearestLocationId } = await import("@/lib/kroger");
    const locationId = await findNearestLocationId(zipCode);

    // Single-tenant: there is only ever one watcher.
    const { data: existing } = await supabase
      .from("watchers")
      .select("id, zip_code, staples(id, search_term)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Same zip => same store => existing price history is still comparable. Keep the
    // watcher and diff the staple list so unchanged staples keep their snapshots.
    if (existing && existing.zip_code === zipCode) {
      const currentStaples = (existing.staples ?? []) as Array<{
        id: string;
        search_term: string;
      }>;

      const removed = currentStaples.filter((s) => !staples.includes(s.search_term));
      const added = staples.filter(
        (term) => !currentStaples.some((s) => s.search_term === term)
      );

      if (removed.length > 0) {
        // Cascades away only the de-selected staples' snapshots, which is correct —
        // you stopped tracking them.
        const { error } = await supabase
          .from("staples")
          .delete()
          .in("id", removed.map((s) => s.id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (added.length > 0) {
        const { error } = await supabase
          .from("staples")
          .insert(added.map((term) => ({ watcher_id: existing.id, search_term: term })));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ watcherId: existing.id, preservedHistory: true });
    }

    // Zip changed (or first-ever setup): a different location_id means prices came
    // from a different store, so the old series is not comparable. Full reset.
    const { error: deleteError } = await supabase
      .from("watchers")
      .delete()
      .not("id", "is", null);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { data: watcher, error: watcherError } = await supabase
      .from("watchers")
      .insert({ zip_code: zipCode, location_id: locationId })
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

    return NextResponse.json({ watcherId: watcher.id, preservedHistory: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
