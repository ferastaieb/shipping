import { NextResponse } from "next/server";
import {
  listCustomers,
  listPackageDetails,
  listPartialShipmentItems,
  listPartialShipments,
  listShipments,
  listUsers,
} from "@/lib/db";

export async function GET() {
  try {
    const [shipments, partialShipments, packageDetails, partialShipmentItems, customers, users] =
      await Promise.all([
        listShipments(),
        listPartialShipments(),
        listPackageDetails(),
        listPartialShipmentItems(),
        listCustomers(),
        listUsers(),
      ]);

    const userMap = new Map(users.map((u) => [u.id, { id: u.id, username: u.username }]));

    const extractActivities = (records: any[], modelName: string) => {
      return records.flatMap((record) => {
        const activities = [];
        if (record.createdByUserId && userMap.has(record.createdByUserId)) {
          activities.push({
            model: modelName,
            action: "create",
            recordId: record.id,
            user: userMap.get(record.createdByUserId),
          });
        }
        if (record.updatedByUserId && userMap.has(record.updatedByUserId)) {
          activities.push({
            model: modelName,
            action: "update",
            recordId: record.id,
            user: userMap.get(record.updatedByUserId),
          });
        }
        return activities;
      });
    };

    const activities = [
      ...extractActivities(shipments, "Shipment"),
      ...extractActivities(partialShipments, "PartialShipment"),
      ...extractActivities(packageDetails, "PackageDetail"),
      ...extractActivities(partialShipmentItems, "PartialShipmentItem"),
      ...extractActivities(customers, "Customer"),
    ];

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error("Error fetching user activities:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
