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
  trackedProductId: string
): KrogerProduct | null {
  const alternatives = products.filter((p) => p.productId !== trackedProductId);
  if (alternatives.length === 0) return null;
  return alternatives.reduce((cheapest, p) => (p.price < cheapest.price ? p : cheapest));
}
