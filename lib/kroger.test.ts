import { describe, it, expect } from "vitest";
import { findNearestLocationId, searchProducts } from "./kroger";

// Manual integration test: run with `npx vitest run lib/kroger.test.ts`
// after setting real KROGER_CLIENT_ID/SECRET in .env.local. Skipped by
// default so `npm test` doesn't burn API quota on every run.
describe.skip("Kroger API (manual integration test)", () => {
  it("finds a location near a real zip code", async () => {
    const locationId = await findNearestLocationId("45202"); // Cincinnati, HQ zip
    expect(locationId).toMatch(/^\d+$/);
  });

  it("finds priced products for a common staple term", async () => {
    const locationId = await findNearestLocationId("45202");
    const products = await searchProducts("eggs", locationId);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty("price");
  });
});
