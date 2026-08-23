import { describe, it, expect } from "vitest";
import { findNearestLocationId, searchProducts, getProductById, parseProduct } from "./kroger";

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

  it("fetches a single product by id", async () => {
    const locationId = await findNearestLocationId("45202");
    const [firstResult] = await searchProducts("eggs", locationId);
    const product = await getProductById(firstResult.productId, locationId);
    expect(product.productId).toBe(firstResult.productId);
    expect(product).toHaveProperty("price");
  });
});

describe("parseProduct", () => {
  it("extracts brand, size, and category alongside price", () => {
    const raw = {
      productId: "0001111041700",
      description: "Kroger 2% Reduced Fat Milk",
      brand: "Kroger",
      categories: ["Dairy", "Milk"],
      items: [{ size: "1 gal", price: { regular: 3.49 } }],
    };

    expect(parseProduct(raw)).toEqual({
      productId: "0001111041700",
      description: "Kroger 2% Reduced Fat Milk",
      brand: "Kroger",
      size: "1 gal",
      category: "Dairy",
      price: 3.49,
    });
  });

  it("falls back to promo price when regular is missing", () => {
    const raw = {
      productId: "X",
      description: "Eggs",
      items: [{ price: { promo: 2.99 } }],
    };
    expect(parseProduct(raw)?.price).toBe(2.99);
  });

  it("returns null when the product has no price at this location", () => {
    const raw = { productId: "X", description: "Eggs", items: [{}] };
    expect(parseProduct(raw)).toBeNull();
  });

  it("returns nulls for missing metadata rather than throwing", () => {
    const raw = {
      productId: "X",
      description: "Generic Eggs",
      items: [{ price: { regular: 2.5 } }],
    };
    const parsed = parseProduct(raw);
    expect(parsed?.brand).toBeNull();
    expect(parsed?.size).toBeNull();
    expect(parsed?.category).toBeNull();
  });
});
