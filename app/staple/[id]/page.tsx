// app/staple/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

type SnapshotRow = {
  price: number;
  captured_at: string;
  product_description: string;
  alt_product_description: string | null;
  alt_price: number | null;
};

export default async function StapleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: staple } = await supabase
    .from("staples")
    .select("search_term, tracked_description")
    .eq("id", id)
    .maybeSingle();

  if (!staple) notFound();

  const { data } = await supabase
    .from("price_snapshots")
    .select("price, captured_at, product_description, alt_product_description, alt_price")
    .eq("staple_id", id)
    .order("captured_at", { ascending: true });

  const snapshots = (data ?? []) as SnapshotRow[];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-medium text-ink/60 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold capitalize text-ink">
        {staple.tracked_description ?? staple.search_term}
      </h1>

      {snapshots.length === 0 ? (
        <p className="mt-6 text-sm text-ink/50">No price history yet.</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/20 text-ink/50">
              <th className="py-2">Date</th>
              <th className="py-2">Price</th>
              <th className="py-2">Product</th>
              <th className="py-2">Cheaper alternative</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.captured_at} className="border-b border-ink/10">
                <td className="py-2">{new Date(s.captured_at).toLocaleDateString()}</td>
                <td className="py-2 font-medium">${Number(s.price).toFixed(2)}</td>
                <td className="py-2">{s.product_description}</td>
                <td className="py-2">
                  {s.alt_product_description && s.alt_price != null
                    ? `${s.alt_product_description} — $${Number(s.alt_price).toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
