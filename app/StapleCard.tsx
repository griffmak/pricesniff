import { comparison, sparklinePoints, priceOnDaysAgo } from "@/lib/dashboard";
import type { Snapshot } from "@/lib/dashboard";

function DeltaBadge({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number | null;
}) {
  const delta = comparison(current, previous);

  if (!delta) {
    return (
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
        <div className="text-sm text-ink/40">not enough history yet</div>
      </div>
    );
  }

  const rising = delta.deltaAbs > 0;
  const flat = Math.abs(delta.deltaAbs) < 0.005;
  const tone = flat ? "text-ink/60" : rising ? "text-red-700" : "text-green-700";
  const arrow = flat ? "—" : rising ? "▲" : "▼";

  return (
    <div className="flex-1">
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className={`text-sm font-semibold ${tone}`}>
        {arrow} ${Math.abs(delta.deltaAbs).toFixed(2)} ({delta.deltaPercent >= 0 ? "+" : ""}
        {delta.deltaPercent.toFixed(1)}%)
      </div>
    </div>
  );
}

export default function StapleCard({
  searchTerm,
  snapshots,
  now,
  latest,
}: {
  searchTerm: string;
  snapshots: Snapshot[];
  now: Date;
  latest: {
    price: number;
    productDescription: string;
    altDescription: string | null;
    altPrice: number | null;
  } | null;
}) {
  if (!latest) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold capitalize text-ink">{searchTerm}</h2>
        <p className="mt-2 text-sm text-ink/50">
          Waiting for the first price check. Prices are collected once a day.
        </p>
      </section>
    );
  }

  const yesterday = priceOnDaysAgo(snapshots, 1, now);
  const lastWeek = priceOnDaysAgo(snapshots, 7, now);

  // Oldest-first prices for the trend line.
  const series = [...snapshots]
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
    .map((s) => s.price);
  const points = sparklinePoints(series, 240, 40);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold capitalize text-ink">{searchTerm}</h2>
        <div className="text-2xl font-extrabold text-ink">${latest.price.toFixed(2)}</div>
      </div>

      <p className="mt-1 text-sm text-ink/60">{latest.productDescription}</p>

      <div className="mt-4 flex gap-4">
        <DeltaBadge label="vs yesterday" current={latest.price} previous={yesterday} />
        <DeltaBadge label="vs last week" current={latest.price} previous={lastWeek} />
      </div>

      {points ? (
        <svg viewBox="0 0 240 40" className="mt-4 h-10 w-full" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-mint"
          />
        </svg>
      ) : (
        <p className="mt-4 text-xs text-ink/40">
          Trend line appears once there are two days of prices.
        </p>
      )}

      {latest.altDescription && latest.altPrice != null && (
        <p className="mt-4 rounded-lg bg-cream px-3 py-2 text-sm text-ink/80">
          Cheaper option: <span className="font-medium">{latest.altDescription}</span> — $
          {latest.altPrice.toFixed(2)}
        </p>
      )}
    </section>
  );
}
