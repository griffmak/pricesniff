import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchProducts } from "@/lib/kroger";
import { detectPriceSpike, cheapestAlternative } from "@/lib/priceWatch";
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
    .select("id, location_id, push_subscription, staples(id, search_term)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let alertsSent = 0;

  for (const watcher of watchers) {
    for (const staple of watcher.staples as Array<{ id: string; search_term: string }>) {
      checked++;
      const products = await searchProducts(staple.search_term, watcher.location_id);
      if (products.length === 0) continue;

      // The tracked product is the top search result for this staple's term.
      const tracked = products[0];

      const { data: lastSnapshot } = await supabase
        .from("price_snapshots")
        .select("price")
        .eq("staple_id", staple.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from("price_snapshots").insert({
        staple_id: staple.id,
        product_id: tracked.productId,
        product_description: tracked.description,
        price: tracked.price,
      });

      const { isSpike, percentChange } = detectPriceSpike({
        previousPrice: lastSnapshot?.price ?? null,
        currentPrice: tracked.price,
      });

      if (isSpike) {
        const swap = cheapestAlternative(products, tracked.productId);
        const swapText = swap
          ? ` Try "${swap.description}" instead — $${swap.price.toFixed(2)}.`
          : "";
        await sendPushNotification(
          watcher.push_subscription as any,
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
