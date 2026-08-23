import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchProducts, getProductById, type KrogerProduct } from "@/lib/kroger";
import { detectPriceSpike, cheapestAlternative, topAlternatives } from "@/lib/priceWatch";
import { sendPushNotification } from "@/lib/push";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: watchers, error } = await supabase
    .from("watchers")
    .select("id, location_id, push_subscription, staples(id, search_term, product_id)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let alertsSent = 0;

  for (const watcher of watchers) {
    for (const staple of watcher.staples as Array<{
      id: string;
      search_term: string;
      product_id: string | null;
    }>) {
      checked++;

      let tracked: KrogerProduct;
      let products;

      if (staple.product_id) {
        try {
          tracked = await getProductById(staple.product_id, watcher.location_id);
        } catch {
          // Locked product is gone/discontinued/unreachable this run — skip it rather
          // than aborting the rest of this watcher's staples.
          continue;
        }
        products = await searchProducts(staple.search_term, watcher.location_id);
      } else {
        // Legacy staple: no locked product_id, keep today's top-search-result behavior.
        products = await searchProducts(staple.search_term, watcher.location_id);
        if (products.length === 0) continue;
        tracked = products[0];
      }

      const { data: lastSnapshot } = await supabase
        .from("price_snapshots")
        .select("price")
        .eq("staple_id", staple.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Computed once per run and stored, so the dashboard never needs a live
      // Kroger call to show a cheaper swap.
      const swap = cheapestAlternative(products, tracked.productId, tracked.price);
      // The expanded card shows a side-by-side comparison, so store the top few
      // rather than only the single cheapest. `swap` is still written separately —
      // it backs the collapsed card's pill and every historical row already has it.
      const comparisons = topAlternatives(products, tracked.productId, tracked.price);

      await supabase.from("price_snapshots").insert({
        staple_id: staple.id,
        product_id: tracked.productId,
        product_description: tracked.description,
        product_brand: tracked.brand,
        product_size: tracked.size,
        product_category: tracked.category,
        price: tracked.price,
        alt_product_id: swap?.productId ?? null,
        alt_product_description: swap?.description ?? null,
        alt_price: swap?.price ?? null,
        alternatives: comparisons.length > 0 ? comparisons : null,
      });

      const { isSpike, percentChange } = detectPriceSpike({
        previousPrice: lastSnapshot?.price ?? null,
        currentPrice: tracked.price,
      });

      // Push delivery is currently broken and tabled; watchers created after v2
      // onboarding have no subscription at all. Skip rather than throw.
      if (isSpike && watcher.push_subscription) {
        const swapText = swap
          ? ` Try "${swap.description}" instead — $${swap.price.toFixed(2)}.`
          : "";
        await sendPushNotification(
          watcher.push_subscription as Parameters<typeof sendPushNotification>[0],
          {
            title: `${tracked.description} is up ${percentChange.toFixed(0)}%`,
            body: `Now $${tracked.price.toFixed(2)}.${swapText}`,
          }
        );
        alertsSent++;
      }
    }
  }

  return NextResponse.json({ checked, alertsSent });
}
