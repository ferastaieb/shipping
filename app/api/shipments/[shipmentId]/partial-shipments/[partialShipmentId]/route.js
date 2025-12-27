// app/api/shipments/[shipmentId]/partial-shipments/[partialShipmentId]/route.js
import { NextResponse } from "next/server";
import {
  deleteNote,
  getItemsByPartialShipmentId,
  getPackagesByPartialShipmentId,
  getPartialShipmentById,
  getPartialShipmentWithDetails,
} from "@/lib/db";
import { batchWriteAll, deleteItem, incrementItem, tableName, updateItem } from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(_request, { params }) {
  const { shipmentId, partialShipmentId } = params;
  try {
    const partialShipment = await getPartialShipmentWithDetails(Number(partialShipmentId), {
      includeCustomer: false,
      includeShipment: false,
    });
    if (!partialShipment || partialShipment.shipmentId !== Number(shipmentId)) {
      return NextResponse.json({ error: "Partial shipment not found" }, { status: 404 });
    }
    return NextResponse.json(partialShipment);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const shipmentId = Number(params.shipmentId);
  const partialShipmentId = Number(params.partialShipmentId);

  try {
    const body = await request.json();

    const existing = await getPartialShipmentById(partialShipmentId);
    if (!existing || existing.shipmentId !== shipmentId) {
      return NextResponse.json({ error: "Partial shipment not found" }, { status: 404 });
    }

    const updateData = {};
    if (body.paymentStatus !== undefined) {
      updateData.paymentStatus = body.paymentStatus;
    }
    if (body.paymentCompleted !== undefined) {
      updateData.paymentCompleted = body.paymentCompleted;
    }

    if (body.paymentStatus === "paid") {
      const newExtra =
        body.extraCostAmount !== undefined
          ? parseFloat(body.extraCostAmount)
          : existing.extraCostAmount || 0;
      const newDiscount =
        body.discountAmount !== undefined
          ? parseFloat(body.discountAmount)
          : existing.discountAmount || 0;
      updateData.amountPaid = existing.cost + newExtra - newDiscount;
    }

    if (body.extraCostAmount !== undefined) {
      updateData.extraCostAmount = parseFloat(body.extraCostAmount);
      if (body.extraCostReason !== undefined) {
        updateData.extraCostReason = body.extraCostReason;
      }
    }
    if (body.discountAmount !== undefined) {
      updateData.discountAmount = parseFloat(body.discountAmount);
    }

    const userId = getUserIdFromCookies();
    const updated = await updateItem(tableName("partialShipments"), { id: partialShipmentId }, {
      ...updateData,
      ...(userId ? { updatedByUserId: userId } : {}),
    });

    if (body.paymentStatus === "paid" && !existing.paymentCompleted) {
      const oldExtra = existing.extraCostAmount || 0;
      const oldDiscount = existing.discountAmount || 0;
      const oldPaid = existing.amountPaid || 0;
      const oldTotal = existing.cost + oldExtra - oldDiscount;
      const outstanding = oldTotal - oldPaid;

      if (outstanding > 0) {
        await incrementItem(
          tableName("customers"),
          { id: existing.customerId },
          { balance: -outstanding }
        );
      }
    }

    if (body.discountAmount !== undefined) {
      const newDiscount = parseFloat(body.discountAmount);
      const oldDiscount = existing.discountAmount || 0;
      const deltaDiscount = newDiscount - oldDiscount;

      if (deltaDiscount !== 0) {
        await incrementItem(
          tableName("customers"),
          { id: existing.customerId },
          { balance: -deltaDiscount }
        );
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const shipmentIdNum = Number(params.shipmentId);
  const partialShipmentId = Number(params.partialShipmentId);

  try {
    const partialShipment = await getPartialShipmentById(partialShipmentId);
    if (!partialShipment || partialShipment.shipmentId !== shipmentIdNum) {
      return NextResponse.json({ error: "Partial shipment not found" }, { status: 404 });
    }

    const [packages, items] = await Promise.all([
      getPackagesByPartialShipmentId(partialShipmentId),
      getItemsByPartialShipmentId(partialShipmentId),
    ]);

    const totals = packages.reduce(
      (acc, p) => {
        const units = p.units ?? 1;
        const vol = (p.length || 0) * (p.width || 0) * (p.height || 0) * units;
        const wgt = (p.weight || 0) * units;
        acc.volumeToSubtract += vol;
        acc.weightToSubtract += wgt;
        return acc;
      },
      { volumeToSubtract: 0, weightToSubtract: 0 }
    );

    const outstanding =
      partialShipment.paymentStatus !== "paid"
        ? partialShipment.cost +
          (partialShipment.extraCostAmount ?? 0) -
          partialShipment.amountPaid -
          (partialShipment.discountAmount ?? 0)
        : 0;

    const packageDeletes = packages.map((pkg) => ({
      DeleteRequest: { Key: { id: pkg.id } },
    }));
    const itemDeletes = items.map((itm) => ({
      DeleteRequest: { Key: { id: itm.id } },
    }));

    if (packageDeletes.length || itemDeletes.length) {
      await batchWriteAll({
        ...(packageDeletes.length ? { [tableName("packageDetails")]: packageDeletes } : {}),
        ...(itemDeletes.length
          ? { [tableName("partialShipmentItems")]: itemDeletes }
          : {}),
      });
    }

    if (partialShipment.noteId) {
      await deleteNote(partialShipment.noteId);
    }

    await deleteItem(tableName("partialShipments"), { id: partialShipmentId });

    if (totals.volumeToSubtract || totals.weightToSubtract) {
      await incrementItem(
        tableName("shipments"),
        { id: shipmentIdNum },
        {
          totalVolume: -totals.volumeToSubtract,
          totalWeight: -totals.weightToSubtract,
        }
      );
    }

    if (outstanding > 0) {
      await incrementItem(
        tableName("customers"),
        { id: partialShipment.customerId },
        { balance: -outstanding }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.log("[DELETE partial-shipment] ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
