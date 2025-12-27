import { NextResponse } from "next/server";
import {
  getCustomerById,
  getItemsByPartialShipmentId,
  getPackagesByPartialShipmentId,
  getPartialShipmentById,
} from "@/lib/db";
import {
  batchWriteAll,
  incrementItem,
  nextId,
  putItem,
  tableName,
  updateItem,
} from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

const num = (v) => Number.parseFloat(v) || 0;
const int = (v) => Number.parseInt(v) || 0;
const vol = (p) => num(p.length) * num(p.width) * num(p.height) * int(p.units);
const wgt = (p) => num(p.weight) * int(p.units);
const safe = (n) => (Number.isFinite(n) ? n : 0);

export async function PUT(req, { params }) {
  const { shipmentId, partialShipmentId } = await params;
  const shipmentIdNum = Number(shipmentId);
  const psId = Number(partialShipmentId);

  try {
    const fd = await req.formData();

    const receiverName = fd.get("receiverName")?.toString() || "";
    const receiverPhone = fd.get("receiverPhone")?.toString() || "";
    const receiverAddress = fd.get("receiverAddress")?.toString() || "";
    const cost = num(fd.get("cost"));
    const amountPaid = num(fd.get("amountPaid"));
    const paymentStatus = fd.get("paymentStatus")?.toString() || "unpaid";
    const paymentResp = fd.get("paymentResponsibility")?.toString() || "";
    const extraCostReason = fd.get("extraCostReason")?.toString() || "";
    const extraCostAmount = num(fd.get("extraCostAmount"));
    const discountAmount = num(fd.get("discountAmount"));

    const packages = JSON.parse(
      typeof fd.get("packages") === "string" ? fd.get("packages") : "[]"
    );
    const items = JSON.parse(
      typeof fd.get("items") === "string" ? fd.get("items") : "[]"
    );

    const existing = await getPartialShipmentById(psId);
    if (!existing || existing.shipmentId !== shipmentIdNum) {
      return NextResponse.json({ error: "Partial shipment not found" }, { status: 404 });
    }

    const [existingPackages, existingItems] = await Promise.all([
      getPackagesByPartialShipmentId(psId),
      getItemsByPartialShipmentId(psId),
    ]);

    const oldVol = existingPackages.reduce((a, p) => a + vol(p), 0);
    const oldWgt = existingPackages.reduce((a, p) => a + wgt(p), 0);
    const oldOutstanding =
      (existing.cost +
        (existing.extraCostAmount || 0) -
        existing.amountPaid -
        (existing.discountAmount || 0)) *
      (existing.paymentStatus === "paid" ? 0 : 1);

    const incomingPkgIds = packages.filter((p) => p.id).map((p) => Number(p.id));
    const deletePkgIds = existingPackages
      .filter((p) => !incomingPkgIds.includes(p.id))
      .map((p) => p.id);

    const incomingItemIds = items.filter((i) => i.id).map((i) => Number(i.id));
    const deleteItemIds = existingItems
      .filter((i) => !incomingItemIds.includes(i.id))
      .map((i) => i.id);

    const deleteRequests = {};
    if (deletePkgIds.length) {
      deleteRequests[tableName("packageDetails")] = deletePkgIds.map((id) => ({
        DeleteRequest: { Key: { id } },
      }));
    }
    if (deleteItemIds.length) {
      deleteRequests[tableName("partialShipmentItems")] = deleteItemIds.map((id) => ({
        DeleteRequest: { Key: { id } },
      }));
    }
    if (Object.keys(deleteRequests).length) {
      await batchWriteAll(deleteRequests);
    }

    const userId = await getUserIdFromCookies();

    for (const p of packages) {
      const base = {
        length: num(p.length),
        width: num(p.width),
        height: num(p.height),
        weight: num(p.weight),
        units: int(p.units),
        typeOfPackage: p.typeOfPackage || "",
        description: p.description || "",
        costType: p.costType || "CPM",
        totalCost: num(p.totalCost),
        partialShipmentId: psId,
        ...(userId ? { updatedByUserId: userId } : {}),
      };
      if (p.id) {
        await updateItem(tableName("packageDetails"), { id: Number(p.id) }, base);
      } else {
        const newId = await nextId("packageDetails");
        await putItem(tableName("packageDetails"), {
          id: newId,
          ...base,
          ...(userId ? { createdByUserId: userId } : {}),
        });
      }
    }

    for (const i of items) {
      const base = {
        weight: num(i.weight),
        origin: i.origin || "",
        hscode: i.hscode || "",
        value: num(i.overallPrice),
        priceByUnit: num(i.priceByUnit),
        description: i.description || "",
        quantity: num(i.quantity),
        unit: i.unit || "",
        partialShipmentId: psId,
        ...(userId ? { updatedByUserId: userId } : {}),
      };
      if (i.id) {
        await updateItem(tableName("partialShipmentItems"), { id: Number(i.id) }, base);
      } else {
        const newId = await nextId("partialShipmentItems");
        await putItem(tableName("partialShipmentItems"), {
          id: newId,
          ...base,
          ...(userId ? { createdByUserId: userId } : {}),
        });
      }
    }

    const newVol = packages.reduce((a, p) => a + vol(p), 0);
    const newWgt = packages.reduce((a, p) => a + wgt(p), 0);

    const updatedPS = await updateItem(tableName("partialShipments"), { id: psId }, {
      receiverName,
      receiverPhone,
      receiverAddress,
      cost,
      amountPaid,
      paymentStatus,
      paymentResponsibility: paymentResp,
      extraCostReason,
      extraCostAmount,
      discountAmount,
      volume: newVol,
      ...(userId ? { updatedByUserId: userId } : {}),
    });

    const deltaVol = newVol - oldVol;
    const deltaWgt = newWgt - oldWgt;

    if (safe(deltaVol) !== 0 || safe(deltaWgt) !== 0) {
      await incrementItem(
        tableName("shipments"),
        { id: shipmentIdNum },
        { totalVolume: safe(deltaVol), totalWeight: safe(deltaWgt) }
      );
    }

    const newOutstanding =
      (cost + extraCostAmount - amountPaid - discountAmount) *
      (paymentStatus === "paid" ? 0 : 1);
    const deltaBal = newOutstanding - oldOutstanding;

    if (deltaBal !== 0 && paymentResp === "customer") {
      await incrementItem(tableName("customers"), { id: existing.customerId }, { balance: deltaBal });
    }

    const [packagesAfter, itemsAfter, customer] = await Promise.all([
      getPackagesByPartialShipmentId(psId),
      getItemsByPartialShipmentId(psId),
      getCustomerById(existing.customerId),
    ]);

    return NextResponse.json({
      ...updatedPS,
      packages: packagesAfter,
      items: itemsAfter,
      customer,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
