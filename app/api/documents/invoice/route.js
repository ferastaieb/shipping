// app/api/documents/invoice/route.js
import { NextResponse } from "next/server";
import {
  getPartialShipmentWithDetails,
  getPartialShipmentsByShipmentId,
  hydratePartialShipment,
} from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const { partialShipmentIds, customerId, shipmentId } = body;

    let partials = [];
    if (partialShipmentIds) {
      partials = await Promise.all(
        partialShipmentIds.map((id) =>
          getPartialShipmentWithDetails(Number(id), {
            includeCustomer: true,
            includePackages: true,
            includeItems: false,
            includeNote: true,
            includeShipment: false,
          })
        )
      );
      partials = partials.filter(Boolean);
    } else if (customerId && shipmentId) {
      const byShipment = await getPartialShipmentsByShipmentId(Number(shipmentId));
      const filtered = byShipment.filter((ps) => ps.customerId === Number(customerId));
      partials = await Promise.all(
        filtered.map((ps) =>
          hydratePartialShipment(ps, {
            includeCustomer: true,
            includeShipment: true,
            includePackages: false,
            includeItems: false,
            includeNote: false,
          })
        )
      );
    }

    return NextResponse.json({
      message: "Invoice generated",
      partials,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
