import { describe, it, expect } from "vitest";
import { priceOnDaysAgo, comparison, sparklinePoints } from "./dashboard";
import type { Snapshot } from "./dashboard";

const NOW = new Date("2026-08-22T18:00:00Z");

const snapshots: Snapshot[] = [
  { price: 3.99, capturedAt: "2026-08-22T13:00:00Z" }, // today
  { price: 3.5, capturedAt: "2026-08-21T13:00:00Z" },  // yesterday
  { price: 3.0, capturedAt: "2026-08-15T13:00:00Z" },  // 7 days ago
];

describe("priceOnDaysAgo", () => {
  it("finds today's price at offset 0", () => {
    expect(priceOnDaysAgo(snapshots, 0, NOW)).toBe(3.99);
  });

  it("finds yesterday's price at offset 1", () => {
    expect(priceOnDaysAgo(snapshots, 1, NOW)).toBe(3.5);
  });

  it("finds last week's price at offset 7", () => {
    expect(priceOnDaysAgo(snapshots, 7, NOW)).toBe(3.0);
  });

  it("returns null when that day has no snapshot", () => {
    expect(priceOnDaysAgo(snapshots, 3, NOW)).toBeNull();
  });

  it("returns null for an empty snapshot list", () => {
    expect(priceOnDaysAgo([], 0, NOW)).toBeNull();
  });

  it("uses the latest snapshot when a day has more than one", () => {
    const twoToday: Snapshot[] = [
      { price: 4.5, capturedAt: "2026-08-22T09:00:00Z" },
      { price: 4.75, capturedAt: "2026-08-22T17:00:00Z" },
    ];
    expect(priceOnDaysAgo(twoToday, 0, NOW)).toBe(4.75);
  });
});

describe("comparison", () => {
  it("computes an increase as positive absolute and percent change", () => {
    const result = comparison(3.3, 3.0);
    expect(result).not.toBeNull();
    expect(result!.deltaAbs).toBeCloseTo(0.3, 5);
    expect(result!.deltaPercent).toBeCloseTo(10, 5);
  });

  it("computes a decrease as negative", () => {
    const result = comparison(2.7, 3.0);
    expect(result!.deltaAbs).toBeCloseTo(-0.3, 5);
    expect(result!.deltaPercent).toBeCloseTo(-10, 5);
  });

  it("returns null when there is no previous price", () => {
    expect(comparison(3.0, null)).toBeNull();
  });

  it("returns null when the previous price is zero (no meaningful percent)", () => {
    expect(comparison(3.0, 0)).toBeNull();
  });
});

describe("sparklinePoints", () => {
  it("maps prices to SVG coordinates with the lowest price at the bottom", () => {
    const points = sparklinePoints([1, 2, 3], 100, 20);
    expect(points).toBe("0,20 50,10 100,0");
  });

  it("draws a flat line through the middle when every price is identical", () => {
    const points = sparklinePoints([5, 5, 5], 100, 20);
    expect(points).toBe("0,10 50,10 100,10");
  });

  it("returns an empty string for fewer than two prices", () => {
    expect(sparklinePoints([5], 100, 20)).toBe("");
    expect(sparklinePoints([], 100, 20)).toBe("");
  });
});
