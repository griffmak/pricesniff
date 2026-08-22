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
};

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

  const data = (await res.json()) as {
    data: Array<{
      productId: string;
      description: string;
      items?: Array<{ price?: { regular?: number; promo?: number } }>;
    }>;
  };

  return data.data
    .map((item) => {
      const priceInfo = item.items?.[0]?.price;
      const price = priceInfo?.regular ?? priceInfo?.promo;
      return price != null
        ? { productId: item.productId, description: item.description, price }
        : null;
    })
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

  const data = (await res.json()) as {
    data: {
      productId: string;
      description: string;
      items?: Array<{ price?: { regular?: number; promo?: number } }>;
    };
  };

  const priceInfo = data.data.items?.[0]?.price;
  const price = priceInfo?.regular ?? priceInfo?.promo;
  if (price == null) {
    throw new Error(`Kroger product ${productId} has no price data`);
  }

  return { productId: data.data.productId, description: data.data.description, price };
}
