// app/api/documents/delivery-list/route.js
import { NextResponse } from "next/server";
import { getPartialShipmentsByShipmentId, getShipmentById } from "@/lib/db";

export async function POST(request) {
  try {
    const { shipmentId } = await request.json();

    const shipment = await getShipmentById(Number(shipmentId));
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const partialShipments = await getPartialShipmentsByShipmentId(Number(shipmentId));

    return NextResponse.json({
      message: "Delivery list generated",
      shipment: { ...shipment, partialShipments },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
