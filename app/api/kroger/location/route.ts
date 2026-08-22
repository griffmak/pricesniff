import { NextRequest, NextResponse } from "next/server";
import { findNearestLocationId } from "@/lib/kroger";

export async function POST(req: NextRequest) {
  const { zipCode } = (await req.json()) as { zipCode?: string };

  if (!zipCode) {
    return NextResponse.json({ error: "Missing zipCode" }, { status: 400 });
  }

  try {
    const locationId = await findNearestLocationId(zipCode);
    return NextResponse.json({ locationId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
