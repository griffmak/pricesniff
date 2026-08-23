import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import StapleCard from "./StapleCard";
import StapleForm from "./onboarding/StapleForm";
import NoseLogo from "./NoseLogo";
import type { Snapshot } from "@/lib/dashboard";
import type { Alternative } from "./AlternativesList";

// Always read fresh from the database — a cached dashboard defeats the purpose.
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

type SnapshotRow = {
  price: number;
  captured_at: string;
  product_description: string;
  product_size: string | null;
  product_category: string | null;
  alt_product_description: string | null;
  alt_price: number | null;
  alternatives: Alternative[] | null;
};

export default async function Home() {
  const { data: watcher } = await supabase
    .from("watchers")
    .select("id, zip_code, staples(id, search_term)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No watcher yet → this IS the onboarding page.
  if (!watcher) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="flex items-center justify-center gap-3">
          <NoseLogo className="h-12 w-12" />
          <h1 className="text-4xl font-extrabold text-ink">PriceSniff</h1>
        </div>
        <p className="mx-auto mt-3 max-w-md text-center text-ink/60">
          One-time setup. No receipts, no bank connection — just an honest look at what
          your groceries actually cost today.
        </p>
        <StapleForm />
      </main>
    );
  }

  const staples = (watcher.staples ?? []) as Array<{ id: string; search_term: string }>;

  const cards = await Promise.all(
    staples.map(async (staple) => {
      const { data } = await supabase
        .from("price_snapshots")
        .select(
          "price, captured_at, product_description, product_size, product_category, alt_product_description, alt_price, alternatives"
        )
        .eq("staple_id", staple.id)
        .order("captured_at", { ascending: false })
        .limit(14);

      const rows = (data ?? []) as SnapshotRow[];
      const snapshots: Snapshot[] = rows.map((r) => ({
        price: Number(r.price),
        capturedAt: r.captured_at,
      }));

      const newest = rows[0];
      return {
        staple,
        snapshots,
        latest: newest
          ? {
              price: Number(newest.price),
              productDescription: newest.product_description,
              altDescription: newest.alt_product_description,
              altPrice: newest.alt_price == null ? null : Number(newest.alt_price),
              category: newest.product_category,
              size: newest.product_size,
              // Snapshots written before the multi-alternatives migration have no
              // `alternatives` — an empty list is the correct rendering, not an error.
              alternatives: newest.alternatives ?? [],
            }
          : null,
      };
    })
  );

  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <NoseLogo className="h-12 w-12" />
          <h1 className="text-4xl font-extrabold text-ink">PriceSniff</h1>
        </div>
        <p className="mt-2 text-sm text-ink/60">
          Tracking {staples.length} item{staples.length === 1 ? "" : "s"} near{" "}
          {watcher.zip_code} · checked once daily
        </p>
      </header>

      <div className="space-y-4">
        {cards.map(({ staple, snapshots, latest }) => (
          <StapleCard
            key={staple.id}
            id={staple.id}
            searchTerm={staple.search_term}
            snapshots={snapshots}
            now={now}
            latest={latest}
          />
        ))}
      </div>

      <footer className="mt-10 text-center">
        <Link href="/onboarding" className="text-sm font-medium text-ink/60 underline">
          Change my zip or items
        </Link>
      </footer>
    </main>
  );
}
