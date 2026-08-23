import { describe, it, expect } from "vitest";
import { detectPriceSpike, cheapestAlternative } from "./priceWatch";
import type { KrogerProduct } from "./kroger";

describe("detectPriceSpike", () => {
  it("flags a spike when price rises 10% or more", () => {
    const result = detectPriceSpike({ previousPrice: 3.0, currentPrice: 3.3 });
    expect(result.isSpike).toBe(true);
    expect(result.percentChange).toBeCloseTo(10, 1);
  });

  it("does not flag a spike below the 10% threshold", () => {
    const result = detectPriceSpike({ previousPrice: 3.0, currentPrice: 3.2 });
    expect(result.isSpike).toBe(false);
  });

  it("does not flag a price drop as a spike", () => {
    const result = detectPriceSpike({ previousPrice: 3.0, currentPrice: 2.5 });
    expect(result.isSpike).toBe(false);
    expect(result.percentChange).toBeLessThan(0);
  });

  it("does not flag anything when there is no previous price (first-ever snapshot)", () => {
    const result = detectPriceSpike({ previousPrice: null, currentPrice: 3.0 });
    expect(result.isSpike).toBe(false);
  });
});

describe("cheapestAlternative", () => {
  it("returns the lowest-priced product excluding the tracked one, when it's actually cheaper", () => {
    const products: KrogerProduct[] = [
      { productId: "A", description: "Name Brand Eggs, 12ct", price: 4.5 },
      { productId: "B", description: "Kroger Brand Eggs, 12ct", price: 3.2 },
      { productId: "C", description: "Organic Eggs, 12ct", price: 6.0 },
    ];
    const result = cheapestAlternative(products, "A", 4.5);
    expect(result?.productId).toBe("B");
  });

  it("returns null when the tracked product is the only match", () => {
    const products: KrogerProduct[] = [
      { productId: "A", description: "Name Brand Eggs, 12ct", price: 4.5 },
    ];
    expect(cheapestAlternative(products, "A", 4.5)).toBeNull();
  });

  it("returns null when every alternative is more expensive than the tracked price", () => {
    const products: KrogerProduct[] = [
      { productId: "A", description: "Simple Truth Cage Free Eggs, 12ct", price: 2.79 },
      { productId: "B", description: "Kroger Brand Eggs, 12ct", price: 3.99 },
      { productId: "C", description: "Organic Eggs, 12ct", price: 6.0 },
    ];
    expect(cheapestAlternative(products, "A", 2.79)).toBeNull();
  });

  it("returns the alternative when it ties the tracked price only if strictly cheaper", () => {
    const products: KrogerProduct[] = [
      { productId: "A", description: "Tracked", price: 3.0 },
      { productId: "B", description: "Same price", price: 3.0 },
    ];
    expect(cheapestAlternative(products, "A", 3.0)).toBeNull();
  });
});
