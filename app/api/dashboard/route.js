// app/api/dashboard/route.js
import { NextResponse } from "next/server";
import { listCustomers, listPartialShipments, listShipments } from "@/lib/db";

export async function GET() {
  try {
    const [shipmentsRaw, partialShipments, customers] = await Promise.all([
      listShipments(),
      listPartialShipments(),
      listCustomers(),
    ]);

    const shipments = shipmentsRaw
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      .map((s) => ({
        id: s.id,
        status: s.isOpen ? "open" : "closed",
        shippingDate: s.dateCreated,
        deliveryDate: s.dateClosed,
        destination: s.destination,
        isOpen: s.isOpen,
        totalWeight: s.totalWeight,
        totalVolume: s.totalVolume,
      }));

    const statusMap = new Map();
    shipmentsRaw.forEach((s) => {
      const key = s.isOpen ? "open" : "closed";
      if (!statusMap.has(key)) {
        statusMap.set(key, { isOpen: s.isOpen, _count: { _all: 0 }, _sum: { totalWeight: 0, totalVolume: 0 } });
      }
      const entry = statusMap.get(key);
      entry._count._all += 1;
      entry._sum.totalWeight += s.totalWeight || 0;
      entry._sum.totalVolume += s.totalVolume || 0;
      statusMap.set(key, entry);
    });
    const statsByStatus = Array.from(statusMap.values());

    const destinationMap = new Map();
    shipmentsRaw.forEach((s) => {
      const key = s.destination || "Unknown";
      if (!destinationMap.has(key)) {
        destinationMap.set(key, { destination: key, _count: { _all: 0 }, _sum: { totalWeight: 0, totalVolume: 0 } });
      }
      const entry = destinationMap.get(key);
      entry._count._all += 1;
      entry._sum.totalWeight += s.totalWeight || 0;
      entry._sum.totalVolume += s.totalVolume || 0;
      destinationMap.set(key, entry);
    });
    const statsByDestination = Array.from(destinationMap.values());

    const totalPartials = partialShipments.length;

    const paymentMap = new Map();
    partialShipments.forEach((ps) => {
      const status = ps.paymentStatus || "unknown";
      if (!paymentMap.has(status)) {
        paymentMap.set(status, { count: 0 });
      }
      paymentMap.get(status).count += 1;
    });
    const byPaymentStatus = Array.from(paymentMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
    }));

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));
    const customerCountMap = new Map();
    partialShipments.forEach((ps) => {
      const count = customerCountMap.get(ps.customerId) || 0;
      customerCountMap.set(ps.customerId, count + 1);
    });

    const byCustomer = Array.from(customerCountMap.entries()).map(([customerId, count]) => ({
      customerId,
      customerName: customerMap.get(customerId) || "Unknown",
      count,
    }));

    return NextResponse.json({
      shipments,
      statsByStatus,
      statsByDestination,
      partialShipmentStats: {
        totalCount: totalPartials,
        byPaymentStatus,
        byCustomer,
      },
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
