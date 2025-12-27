import { NextResponse } from "next/server";
import { saveFileLocally } from "@/lib/upload";
import { createNote, getCustomerById, getShipmentById } from "@/lib/db";
import { incrementItem, nextId, putItem, tableName } from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  const { shipmentId } = await params;
  const shipmentIdNum = Number(shipmentId);

  try {
    const formData = await request.formData();

    const customerId = Number(formData.get("customerId")?.toString() || "0");
    const receiverName = formData.get("receiverName")?.toString() || "";
    const receiverPhone = formData.get("receiverPhone")?.toString() || "";
    const receiverAddress = formData.get("receiverAddress")?.toString() || "";
    const costRaw = formData.get("cost")?.toString() || "0";
    const amountPaidRaw = formData.get("amountPaid")?.toString() || "0";
    const paymentStatus = formData.get("paymentStatus")?.toString() || "unpaid";
    const paymentResponsibility = formData.get("paymentResponsibility")?.toString() || "";
    const noteContent = formData.get("noteContent")?.toString() || "";

    const extraCostReason = formData.get("extraCostReason")?.toString() || "";
    const extraCostAmountRaw = formData.get("extraCostAmount")?.toString() || "0";
    const extraCostAmount = parseFloat(extraCostAmountRaw);

    const cost = parseFloat(costRaw);
    const amountPaid = parseFloat(amountPaidRaw);

    const packagesField = formData.get("packages");
    const itemsField = formData.get("items");
    const packagesJson = typeof packagesField === "string" ? packagesField : "[]";
    const itemsJson = typeof itemsField === "string" ? itemsField : "[]";

    let packages: any[] = [];
    let items: any[] = [];
    try {
      packages = JSON.parse(packagesJson);
      items = JSON.parse(itemsJson);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse packages or items JSON." },
        { status: 400 }
      );
    }

    const imageFiles = formData.getAll("noteImages") as File[];
    const imagePaths: string[] = [];
    for (const file of imageFiles) {
      if (file && file.name) {
        const fileUrl = await saveFileLocally(file, `partialShipments/${shipmentIdNum}/`);
        imagePaths.push(fileUrl);
      }
    }

    if (!receiverName || !receiverPhone || !receiverAddress) {
      return NextResponse.json(
        { error: "Receiver name, phone, and address are required." },
        { status: 400 }
      );
    }

    const totalVolume = packages.length
      ? packages.reduce((acc: number, pkg: any) => {
          const length = parseFloat(pkg.length) || 0;
          const width = parseFloat(pkg.width) || 0;
          const height = parseFloat(pkg.height) || 0;
          const unit = parseFloat(pkg.units) || 1;
          return acc + length * width * height * unit;
        }, 0)
      : 0;

    const totalWeight = packages.length
      ? packages.reduce((acc: number, pkg: any) => {
          const weight = parseFloat(pkg.weight) || 1;
          const unit = parseFloat(pkg.units) || 1;
          return acc + weight * unit;
        }, 0)
      : 0;

    const shipment = await getShipmentById(shipmentIdNum);
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    const customer = await getCustomerById(customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const userId = await getUserIdFromCookies();

    let createdNoteId: number | undefined;
    let createdNote: any = null;
    if (noteContent.trim() || imagePaths.length > 0) {
      createdNote = await createNote({
        content: noteContent.trim() || undefined,
        images: imagePaths.length > 0 ? imagePaths : undefined,
        userId: userId || undefined,
      });
      createdNoteId = createdNote.id;
    }

    const totalCostWithExtra = cost + extraCostAmount;
    const outstanding = paymentStatus !== "paid" ? totalCostWithExtra - amountPaid : 0;

    const partialShipmentId = await nextId("partialShipments");
    const now = new Date().toISOString();
    const partialShipment = {
      id: partialShipmentId,
      shipmentId: shipmentIdNum,
      customerId,
      receiverName,
      receiverPhone,
      receiverAddress,
      volume: totalVolume,
      cost,
      amountPaid,
      paymentStatus,
      paymentResponsibility,
      paymentCompleted: false,
      noteId: createdNoteId,
      extraCostReason,
      extraCostAmount,
      discountAmount: 0,
      dateCreated: now,
      ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
    };

    await putItem(tableName("partialShipments"), partialShipment);

    const createdPackages: any[] = [];
    for (const p of packages) {
      const packageId = await nextId("packageDetails");
      const pkg = {
        id: packageId,
        partialShipmentId,
        length: parseFloat(p.length) || 0,
        width: parseFloat(p.width) || 0,
        height: parseFloat(p.height) || 0,
        weight: parseFloat(p.weight) || 0,
        units: parseInt(p.units) || 1,
        typeOfPackage: p.typeOfPackage || "",
        description: p.description || "",
        costType: p.costType || "CPM",
        totalCost: parseFloat(p.totalCost) || 0,
        ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
      };
      await putItem(tableName("packageDetails"), pkg);
      createdPackages.push(pkg);
    }

    const createdItems: any[] = [];
    for (const i of items) {
      const itemId = await nextId("partialShipmentItems");
      const item = {
        id: itemId,
        partialShipmentId,
        weight: parseFloat(i.weight) || 0,
        origin: i.origin || "",
        hscode: i.hscode || "",
        value: parseFloat(i.overallPrice) || 0,
        priceByUnit: parseFloat(i.priceByUnit) || 0,
        description: i.description || "",
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit || "",
        ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
      };
      await putItem(tableName("partialShipmentItems"), item);
      createdItems.push(item);
    }

    await incrementItem(
      tableName("shipments"),
      { id: shipmentIdNum },
      { totalVolume, totalWeight }
    );

    if (paymentStatus !== "paid" && outstanding > 0) {
      await incrementItem(tableName("customers"), { id: customerId }, { balance: outstanding });
    }

    return NextResponse.json(
      {
        ...partialShipment,
        note: createdNote,
        packages: createdPackages,
        items: createdItems,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.log("Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
