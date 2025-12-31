import { NextResponse } from "next/server";
import { listPartialShipmentItems } from "@/lib/db";

export async function GET() {
  try {
    const items = await listPartialShipmentItems();
    items.sort((a, b) => (b.id || 0) - (a.id || 0));
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
