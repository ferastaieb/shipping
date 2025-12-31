import { NextResponse } from "next/server";
import {
  getPackagesByPartialShipmentId,
  getPartialShipmentById,
  getShipmentById,
} from "@/lib/db";
import { incrementItem, tableName, updateItem } from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeTotals = (packages: any[]) =>
  packages.reduce(
    (acc, pkg) => {
      const units = toNumber(pkg.units, 1);
      const volume =
        toNumber(pkg.length) * toNumber(pkg.width) * toNumber(pkg.height) * units;
      const weight = toNumber(pkg.weight) * units;
      acc.volume += volume;
      acc.weight += weight;
      return acc;
    },
    { volume: 0, weight: 0 }
  );

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string; partialShipmentId: string }> }
) {
  const { shipmentId, partialShipmentId } = await params;
  const shipmentIdNum = Number(shipmentId);
  const partialShipmentIdNum = Number(partialShipmentId);

  if (!Number.isFinite(shipmentIdNum) || !Number.isFinite(partialShipmentIdNum)) {
    return NextResponse.json({ error: "Invalid shipment id." }, { status: 400 });
  }

  let payload: { targetShipmentId?: number } = {};
  try {
    payload = await request.json();
  } catch {}

  const targetShipmentId = Number(payload.targetShipmentId);
  if (!Number.isFinite(targetShipmentId)) {
    return NextResponse.json({ error: "Target shipment id is required." }, { status: 400 });
  }

  if (targetShipmentId === shipmentIdNum) {
    return NextResponse.json(
      { error: "Target shipment must be different from the current shipment." },
      { status: 400 }
    );
  }

  const partialShipment = await getPartialShipmentById(partialShipmentIdNum);
  if (!partialShipment || partialShipment.shipmentId !== shipmentIdNum) {
    return NextResponse.json({ error: "Partial shipment not found." }, { status: 404 });
  }

  const [sourceShipment, targetShipment, packages] = await Promise.all([
    getShipmentById(shipmentIdNum),
    getShipmentById(targetShipmentId),
    getPackagesByPartialShipmentId(partialShipmentIdNum),
  ]);

  if (!sourceShipment) {
    return NextResponse.json({ error: "Source shipment not found." }, { status: 404 });
  }

  if (!targetShipment) {
    return NextResponse.json({ error: "Target shipment not found." }, { status: 404 });
  }

  if (!sourceShipment.isOpen) {
    return NextResponse.json({ error: "Cannot transfer from a closed batch." }, { status: 400 });
  }

  if (!targetShipment.isOpen) {
    return NextResponse.json({ error: "Cannot transfer to a closed batch." }, { status: 400 });
  }

  const totals = computeTotals(packages);
  const userId = await getUserIdFromCookies();

  const updatedPartial = await updateItem(tableName("partialShipments"), { id: partialShipmentIdNum }, {
    shipmentId: targetShipmentId,
    ...(userId ? { updatedByUserId: userId } : {}),
  });

  if (totals.volume !== 0 || totals.weight !== 0) {
    await Promise.all([
      incrementItem(
        tableName("shipments"),
        { id: shipmentIdNum },
        { totalVolume: -totals.volume, totalWeight: -totals.weight }
      ),
      incrementItem(
        tableName("shipments"),
        { id: targetShipmentId },
        { totalVolume: totals.volume, totalWeight: totals.weight }
      ),
    ]);
  }

  return NextResponse.json({ success: true, partialShipment: updatedPartial });
}
