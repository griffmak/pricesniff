import Link from "next/link";
import { Minus, Tag, TrendingDown, TrendingUp } from "lucide-react";
import { comparison, sparklinePoints, priceOnDaysAgo } from "@/lib/dashboard";
import type { Snapshot } from "@/lib/dashboard";

function DeltaBadge({
  label,
  current,
  previous,
  secondary = false,
}: {
  label: string;
  current: number;
  previous: number | null;
  secondary?: boolean;
}) {
  const delta = comparison(current, previous);
  const flat = delta != null && Math.abs(delta.deltaAbs) < 0.005;
  const direction: "down" | "up" | "none" = !delta || flat ? "none" : delta.deltaAbs > 0 ? "up" : "down";
  const Icon = direction === "down" ? TrendingDown : direction === "up" ? TrendingUp : Minus;
  const tone =
    direction === "down" ? "text-mint-deep" : direction === "up" ? "text-warning" : "text-ink/50";

  const text = !delta
    ? "not enough history yet"
    : flat
      ? "No change"
      : `${Math.abs(delta.deltaAbs) < 1 ? `${Math.round(Math.abs(delta.deltaAbs) * 100)}¢` : `$${Math.abs(delta.deltaAbs).toFixed(2)}`} · ${Math.abs(delta.deltaPercent).toFixed(1)}%`;

  return (
    <div className="text-right">
      <p className={`text-[0.72rem] font-medium text-ink/60 ${secondary ? "opacity-50" : "opacity-70"}`}>
        {label}
      </p>
      <p
        className={`mt-1 flex items-center justify-end gap-1 leading-4 ${
          secondary ? "text-[0.7rem] font-medium opacity-60" : "text-xs font-semibold"
        } ${tone}`}
      >
        <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={direction === "none" ? 3 : 2} />
        {text}
      </p>
    </div>
  );
}

export default function StapleCard({
  id,
  searchTerm,
  snapshots,
  now,
  latest,
}: {
  id: string;
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
      <section className="rounded-2xl bg-card-tint p-5 shadow-sm">
        <h2 className="text-lg font-bold capitalize text-ink">
          <Link href={`/staple/${id}`} className="hover:underline">
            {searchTerm}
          </Link>
        </h2>
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
  const endY = points ? points.split(" ").at(-1)?.split(",")[1] : undefined;

  return (
    <section className="rounded-2xl bg-card-tint p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold capitalize text-ink">
          <Link href={`/staple/${id}`} className="hover:underline">
            {searchTerm}
          </Link>
        </h2>
        <div className="text-2xl font-extrabold text-ink">${latest.price.toFixed(2)}</div>
      </div>

      <p className="mt-1 text-sm text-ink/60">{latest.productDescription}</p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <DeltaBadge label="Yesterday" current={latest.price} previous={yesterday} />
        <DeltaBadge label="Last week" current={latest.price} previous={lastWeek} secondary />
      </div>

      {points ? (
        <div className="mt-4 h-10">
          <svg
            viewBox="0 0 240 40"
            className="h-full w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={`14-day price trend for ${searchTerm}`}
          >
            <path d="M0 36H240" stroke="currentColor" className="text-ink/10" strokeWidth="1" />
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="text-mint-deep"
            />
            {endY && <circle cx="240" cy={endY} r="3" fill="currentColor" className="text-mint-deep" />}
          </svg>
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink/40">
          Trend line appears once there are two days of prices.
        </p>
      )}

      {latest.altDescription && latest.altPrice != null && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-cream px-3.5 py-3 text-sm">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full bg-mint/30 text-mint-deep"
            aria-hidden="true"
          >
            <Tag className="size-3.5" strokeWidth={2.5} />
          </span>
          <p className="min-w-0 leading-5 text-ink/80">
            <span className="font-bold">Cheaper option</span> · {latest.altDescription} —{" "}
            <strong>${latest.altPrice.toFixed(2)}</strong>
          </p>
        </div>
      )}
    </section>
  );
}
