import { NextResponse } from "next/server";
import {
  createNote,
  getItemsByPartialShipmentId,
  getPackagesByPartialShipmentId,
  getPartialShipmentById,
  getPartialShipmentWithDetails,
} from "@/lib/db";
import { saveFileLocally } from "@/lib/upload";
import { incrementItem, nextId, putItem, tableName, updateItem } from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  const { shipmentId } = await params;
  const shipmentIdNum = Number(shipmentId);

  const shipment = await getPartialShipmentById(shipmentIdNum);
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  const existingPackages = await getPackagesByPartialShipmentId(shipmentIdNum);

  const formData = await request.formData();

  const packagesJson = formData.get("packages")?.toString() || "[]";
  const itemsJson = formData.get("items")?.toString() || "[]";
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

  if (packages.length > 0) {
    if (existingPackages.length > 0) {
      return NextResponse.json(
        { error: "Cannot add packages to a shipment that already has packages." },
        { status: 400 }
      );
    }

    const isValidPackage = packages.every(
      (pkg) => pkg.length && pkg.width && pkg.height && pkg.weight
    );
    if (!isValidPackage) {
      return NextResponse.json(
        { error: "Invalid package structure. All dimensions and weight are required." },
        { status: 400 }
      );
    }
  }

  const noteContent = formData.get("noteContent")?.toString() || "";
  const imageFiles = formData.getAll("noteImages") as File[];
  const imagePaths: string[] = [];
  for (const file of imageFiles) {
    if (file && file.name) {
      const fileUrl = await saveFileLocally(file, `shipments/${shipmentIdNum}/`);
      imagePaths.push(fileUrl);
    }
  }

  let totalVolume = 0;
  let totalWeight = 0;

  if (packages.length > 0) {
    totalVolume = packages.reduce((acc: number, pkg: any) => {
      const length = parseFloat(pkg.length) || 0;
      const width = parseFloat(pkg.width) || 0;
      const height = parseFloat(pkg.height) || 0;
      const unit = parseFloat(pkg.units) || 1;
      return acc + length * width * height * unit;
    }, 0);

    totalWeight = packages.reduce((acc: number, pkg: any) => {
      const weight = parseFloat(pkg.weight) || 0;
      const unit = parseFloat(pkg.units) || 1;
      return acc + weight * unit;
    }, 0);
  }

  const userId = getUserIdFromCookies();

  let createdNoteId: number | undefined;
  if (noteContent.trim() || imagePaths.length > 0) {
    const newNote = await createNote({
      content: noteContent.trim() || undefined,
      images: imagePaths.length > 0 ? imagePaths : undefined,
      userId: userId || undefined,
    });
    createdNoteId = newNote.id;
  }

  try {
    if (packages.length > 0) {
      await incrementItem(
        tableName("shipments"),
        { id: shipment.shipmentId },
        { totalVolume, totalWeight }
      );

      await incrementItem(
        tableName("partialShipments"),
        { id: shipmentIdNum },
        { volume: totalVolume }
      );
    }

    const createdPackages: any[] = [];
    if (packages.length > 0) {
      for (const p of packages) {
        const packageId = await nextId("packageDetails");
        const pkg = {
          id: packageId,
          partialShipmentId: shipmentIdNum,
          length: parseFloat(p.length) || 0,
          width: parseFloat(p.width) || 0,
          height: parseFloat(p.height) || 0,
          weight: parseFloat(p.weight) || 0,
          units: parseInt(p.units) || 1,
          typeOfPackage: p.typeOfPackage || "package",
          ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
        };
        await putItem(tableName("packageDetails"), pkg);
        createdPackages.push(pkg);
      }
    }

    if (items.length > 0) {
      for (const i of items) {
        const itemId = await nextId("partialShipmentItems");
        await putItem(tableName("partialShipmentItems"), {
          id: itemId,
          partialShipmentId: shipmentIdNum,
          weight: parseFloat(i.weight) || 0,
          origin: i.origin || "",
          hscode: i.hscode || "",
          value: parseFloat(i.overallPrice) || 0,
          priceByUnit: parseFloat(i.priceByUnit) || 0,
          description: i.description || "",
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit || "",
          ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
        });
      }
    }

    if (createdNoteId) {
      await updateItem(tableName("partialShipments"), { id: shipmentIdNum }, {
        noteId: createdNoteId,
        ...(userId ? { updatedByUserId: userId } : {}),
      });
    }

    const updatedShipment = await getPartialShipmentWithDetails(shipmentIdNum, {
      includePackages: true,
      includeItems: true,
      includeNote: true,
      includeShipment: true,
    });

    return NextResponse.json(updatedShipment, { status: 200 });
  } catch (error: any) {
    console.error("Error updating shipment:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
