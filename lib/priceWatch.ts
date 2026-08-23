import type { KrogerProduct } from "./kroger";

export const SPIKE_THRESHOLD_PERCENT = 10;

export function detectPriceSpike(input: {
  previousPrice: number | null;
  currentPrice: number;
}): { isSpike: boolean; percentChange: number } {
  if (input.previousPrice == null || input.previousPrice === 0) {
    return { isSpike: false, percentChange: 0 };
  }
  const percentChange =
    ((input.currentPrice - input.previousPrice) / input.previousPrice) * 100;
  const FLOAT_EPSILON = 1e-9;
  return {
    isSpike: percentChange >= SPIKE_THRESHOLD_PERCENT - FLOAT_EPSILON,
    percentChange,
  };
}

export function cheapestAlternative(
  products: KrogerProduct[],
  trackedProductId: string,
  trackedPrice: number
): KrogerProduct | null {
  const alternatives = products.filter((p) => p.productId !== trackedProductId);
  if (alternatives.length === 0) return null;
  const cheapest = alternatives.reduce((a, b) => (b.price < a.price ? b : a));
  return cheapest.price < trackedPrice ? cheapest : null;
}

export const MAX_ALTERNATIVES = 3;

/**
 * The cheapest alternatives that actually beat the tracked price, cheapest first,
 * capped at MAX_ALTERNATIVES. Same "must be strictly cheaper" rule as
 * cheapestAlternative — an alternative that ties or costs more is not an
 * alternative worth showing. Returns [] rather than null: the expanded card
 * renders a list, and an empty list is the natural no-op.
 */
export function topAlternatives(
  products: KrogerProduct[],
  trackedProductId: string,
  trackedPrice: number
): KrogerProduct[] {
  return products
    .filter((p) => p.productId !== trackedProductId && p.price < trackedPrice)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_ALTERNATIVES);
}
