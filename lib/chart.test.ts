// lib/chart.test.ts
import { describe, it, expect } from "vitest";
import { chartGeometry, nearestPointIndex } from "./chart";

const snapshots = [
  { price: 2.0, capturedAt: "2026-08-01T13:00:00Z" },
  { price: 4.0, capturedAt: "2026-08-02T13:00:00Z" },
  { price: 3.0, capturedAt: "2026-08-03T13:00:00Z" },
];

describe("chartGeometry", () => {
  it("maps the highest price to the top of the box and the lowest to the bottom", () => {
    const g = chartGeometry(snapshots, 300, 100);
    expect(g.points[0].y).toBe(100); // cheapest → bottom
    expect(g.points[1].y).toBe(0); // priciest → top
  });

  it("spreads points evenly across the full width, oldest first", () => {
    const g = chartGeometry(snapshots, 300, 100);
    expect(g.points.map((p) => p.x)).toEqual([0, 150, 300]);
    expect(g.points[0].price).toBe(2.0);
  });

  it("draws a flat series through the vertical middle instead of dividing by zero", () => {
    const flat = [
      { price: 3.0, capturedAt: "2026-08-01T13:00:00Z" },
      { price: 3.0, capturedAt: "2026-08-02T13:00:00Z" },
    ];
    const g = chartGeometry(flat, 300, 100);
    expect(g.points.every((p) => p.y === 50)).toBe(true);
  });

  it("sorts unsorted input oldest-first", () => {
    const g = chartGeometry([snapshots[2], snapshots[0], snapshots[1]], 300, 100);
    expect(g.points.map((p) => p.price)).toEqual([2.0, 4.0, 3.0]);
  });

  it("returns an empty geometry for fewer than two snapshots", () => {
    expect(chartGeometry([snapshots[0]], 300, 100).points).toEqual([]);
    expect(chartGeometry([], 300, 100).points).toEqual([]);
  });

  it("reports the min and max for axis labels", () => {
    const g = chartGeometry(snapshots, 300, 100);
    expect(g.min).toBe(2.0);
    expect(g.max).toBe(4.0);
  });
});

describe("nearestPointIndex", () => {
  it("finds the closest point to a cursor x", () => {
    const g = chartGeometry(snapshots, 300, 100);
    expect(nearestPointIndex(g.points, 10)).toBe(0);
    expect(nearestPointIndex(g.points, 140)).toBe(1);
    expect(nearestPointIndex(g.points, 290)).toBe(2);
  });

  it("returns null when there are no points", () => {
    expect(nearestPointIndex([], 50)).toBeNull();
  });
});
