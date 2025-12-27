import { NextResponse } from "next/server";
import { getPartialShipmentWithDetails } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  const { shipmentId } = await params;
  const partialShipmentId = Number(shipmentId);
//   console.log(partialShipmentId)
  try {
    const partialShipment = await getPartialShipmentWithDetails(partialShipmentId, {
      includeCustomer: true,
      includePackages: true,
      includeItems: true,
      includeNote: true,
    });

    if (!partialShipment) {
      return NextResponse.json(
        { error: "Partial shipment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(partialShipment, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
