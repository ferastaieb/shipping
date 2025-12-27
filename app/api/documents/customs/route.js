// app/api/documents/customs/route.js
import { NextResponse } from "next/server";
import { getPartialShipmentsByShipmentId, getShipmentById } from "@/lib/db";

export async function POST(request) {
  try {
    const { shipmentId } = await request.json();

    const shipment = await getShipmentById(Number(shipmentId));
    if (!shipment || shipment.isOpen) {
      return NextResponse.json({ error: "Shipment not found or not closed" }, { status: 400 });
    }

    const partialShipments = await getPartialShipmentsByShipmentId(Number(shipmentId));

    return NextResponse.json({
      message: "Customs document generated",
      shipment: { ...shipment, partialShipments },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
