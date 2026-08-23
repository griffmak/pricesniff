const TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token";
const API_BASE = "https://api.kroger.com/v1";

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getKrogerToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!res.ok) {
    throw new Error(`Kroger token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s early
  };
  return cachedToken.value;
}

export async function findNearestLocationId(zipCode: string): Promise<string> {
  const token = await getKrogerToken();
  const res = await fetch(
    `${API_BASE}/locations?filter.zipCode.near=${encodeURIComponent(zipCode)}&filter.limit=1`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );

  if (!res.ok) {
    throw new Error(`Kroger location search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data: Array<{ locationId: string }> };
  if (data.data.length === 0) {
    throw new Error(`No Kroger location found near zip ${zipCode}`);
  }
  return data.data[0].locationId;
}

export type KrogerProduct = {
  productId: string;
  description: string;
  price: number; // regular price; falls back to promo if regular is missing
  brand: string | null;
  size: string | null; // package size, e.g. "1 gal"
  category: string | null; // first Kroger category, drives the UI icon
};

/** The raw shape we read off a Kroger product payload. Everything past productId,
 *  description, and a price is optional — this account's responses do not always
 *  carry brand/size/category, and a missing one must not drop the product. */
type RawKrogerProduct = {
  productId: string;
  description: string;
  brand?: string;
  categories?: string[];
  items?: Array<{ size?: string; price?: { regular?: number; promo?: number } }>;
};

/**
 * One raw Kroger product → our shape, or null when it has no price at this
 * location. Null is a normal outcome (out-of-stock, not carried), not an error.
 */
export function parseProduct(raw: RawKrogerProduct): KrogerProduct | null {
  const priceInfo = raw.items?.[0]?.price;
  const price = priceInfo?.regular ?? priceInfo?.promo;
  if (price == null) return null;

  return {
    productId: raw.productId,
    description: raw.description,
    price,
    brand: raw.brand ?? null,
    size: raw.items?.[0]?.size ?? null,
    category: raw.categories?.[0] ?? null,
  };
}

export async function searchProducts(
  term: string,
  locationId: string
): Promise<KrogerProduct[]> {
  const token = await getKrogerToken();
  const url = `${API_BASE}/products?filter.term=${encodeURIComponent(
    term
  )}&filter.locationId=${locationId}&filter.limit=10`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Kroger product search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data: RawKrogerProduct[] };

  return data.data
    .map(parseProduct)
    .filter((p): p is KrogerProduct => p !== null);
}

export async function getProductById(
  productId: string,
  locationId: string
): Promise<KrogerProduct> {
  const token = await getKrogerToken();
  const url = `${API_BASE}/products/${encodeURIComponent(
    productId
  )}?filter.locationId=${locationId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Kroger product lookup failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data: RawKrogerProduct };

  const product = parseProduct(data.data);
  if (product == null) {
    throw new Error(`Kroger product ${productId} has no price data`);
  }
  return product;
}
