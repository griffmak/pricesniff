// app/PriceChart.tsx
"use client";

import { useState } from "react";
import { chartGeometry, nearestPointIndex, polylinePoints } from "@/lib/chart";
import type { Snapshot } from "@/lib/dashboard";

const WIDTH = 320;
const HEIGHT = 120;

export default function PriceChart({
  snapshots,
  label,
}: {
  snapshots: Snapshot[];
  label: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { points, min, max } = chartGeometry(snapshots, WIDTH, HEIGHT);

  if (points.length === 0) {
    return (
      <p className="text-xs text-ink/40">
        The price chart appears once there are two days of prices.
      </p>
    );
  }

  const active = activeIndex == null ? null : points[activeIndex];

  // The SVG scales to its container, so a client x must be converted back into
  // viewBox units before hit-testing.
  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const viewBoxX = ((event.clientX - box.left) / box.width) * WIDTH;
    setActiveIndex(nearestPointIndex(points, viewBoxX));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-ink/60">Price history</p>
        <p className="text-xs tabular-nums text-ink/50">
          {active
            ? `${new Date(active.capturedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })} · $${active.price.toFixed(2)}`
            : `$${min.toFixed(2)}–$${max.toFixed(2)}`}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 h-28 w-full touch-none"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Price history for ${label}`}
        onPointerMove={handleMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <path
          d={`M0 ${HEIGHT - 1}H${WIDTH}`}
          stroke="currentColor"
          className="text-ink/10"
          strokeWidth="1"
        />
        <polyline
          points={polylinePoints(points)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="text-mint-deep"
        />
        {active && (
          <>
            <line
              x1={active.x}
              y1={0}
              x2={active.x}
              y2={HEIGHT}
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="text-ink/25"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="4"
              fill="currentColor"
              className="text-mint-deep"
            />
          </>
        )}
      </svg>

      <p className="mt-1 text-[0.68rem] text-ink/40">
        {points.length} day{points.length === 1 ? "" : "s"} of prices · hover to read a
        day
      </p>
    </div>
  );
}
