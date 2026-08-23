// lib/chart.ts
import type { Snapshot } from "./dashboard";

export type ChartPoint = {
  x: number;
  y: number;
  price: number;
  capturedAt: string;
};

export type ChartGeometry = {
  points: ChartPoint[];
  min: number;
  max: number;
};

/**
 * Snapshots → plotted coordinates inside a width×height box, oldest first.
 *
 * This is the big-chart sibling of dashboard.ts's `sparklinePoints`, which returns
 * only an SVG points string. Hover hit-testing needs each point's price and date
 * back out, so this returns structured points instead. `sparklinePoints` is left
 * alone and still backs the collapsed card.
 *
 * SVG y grows downward, so the highest price maps to y=0. A flat series is drawn
 * through the vertical middle rather than dividing by a zero range.
 */
export function chartGeometry(
  snapshots: Snapshot[],
  width: number,
  height: number
): ChartGeometry {
  if (snapshots.length < 2) return { points: [], min: 0, max: 0 };

  const ordered = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const prices = ordered.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const step = width / (ordered.length - 1);

  const points = ordered.map((snapshot, i) => ({
    x: i * step,
    y: range === 0 ? height / 2 : height - ((snapshot.price - min) / range) * height,
    price: snapshot.price,
    capturedAt: snapshot.capturedAt,
  }));

  return { points, min, max };
}

/** Index of the point closest to `cursorX`, or null when there is nothing plotted. */
export function nearestPointIndex(points: ChartPoint[], cursorX: number): number | null {
  if (points.length === 0) return null;

  let bestIndex = 0;
  let bestDistance = Infinity;
  points.forEach((point, i) => {
    const distance = Math.abs(point.x - cursorX);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  });
  return bestIndex;
}

/** ChartPoints → the `points` attribute string an SVG <polyline> expects. */
export function polylinePoints(points: ChartPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}
