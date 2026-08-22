import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/kroger";

export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get("term");
  const locationId = req.nextUrl.searchParams.get("locationId");

  if (!term || !locationId) {
    return NextResponse.json({ error: "Missing term or locationId" }, { status: 400 });
  }

  try {
    const products = await searchProducts(term, locationId);
    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
