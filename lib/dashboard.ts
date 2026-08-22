export type Snapshot = {
  price: number;
  capturedAt: string; // ISO timestamp
};

/** UTC calendar day key, e.g. "2026-08-22". Snapshots are compared by day, not by
 *  elapsed hours, so a cron that runs at 13:00 still counts as "yesterday" when
 *  viewed at 09:00 the next morning. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Price recorded `daysAgo` calendar days before `now`, or null if that day has no
 * snapshot. Null is the signal that drives the dashboard's "not enough history yet"
 * state — it is a normal outcome, not an error.
 */
export function priceOnDaysAgo(
  snapshots: Snapshot[],
  daysAgo: number,
  now: Date
): number | null {
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() - daysAgo);
  const key = dayKey(target);

  const sameDay = snapshots.filter((s) => dayKey(new Date(s.capturedAt)) === key);
  if (sameDay.length === 0) return null;

  // A day can hold more than one snapshot (a manual cron trigger, a retry). The
  // latest one is the day's real closing price.
  const latest = sameDay.reduce((newest, s) =>
    new Date(s.capturedAt) > new Date(newest.capturedAt) ? s : newest
  );
  return latest.price;
}

/**
 * Absolute and percentage change from `previous` to `current`. Null when there is no
 * comparable previous price.
 */
export function comparison(
  current: number,
  previous: number | null
): { deltaAbs: number; deltaPercent: number } | null {
  if (previous == null || previous === 0) return null;
  return {
    deltaAbs: current - previous,
    deltaPercent: ((current - previous) / previous) * 100,
  };
}

/**
 * Prices → an SVG `points` string for a <polyline>, oldest first. SVG y grows
 * downward, so the highest price maps to y=0. A flat series is drawn through the
 * vertical middle rather than dividing by a zero range.
 */
export function sparklinePoints(
  prices: number[],
  width: number,
  height: number
): string {
  if (prices.length < 2) return "";

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const step = width / (prices.length - 1);

  return prices
    .map((price, i) => {
      const x = i * step;
      const y = range === 0 ? height / 2 : height - ((price - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}
