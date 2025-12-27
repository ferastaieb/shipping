import { NextResponse } from "next/server";
import { listCustomers, listPartialShipments } from "@/lib/db";

export async function GET() {
  try {
    const [customers, partialShipments] = await Promise.all([
      listCustomers(),
      listPartialShipments(),
    ]);

    const totalCustomers = customers.length;

    const customerBalances = [...customers]
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 10)
      .map((c) => ({ id: c.id, name: c.name, balance: c.balance }));

    const shipmentCountMap = new Map();
    partialShipments.forEach((ps) => {
      shipmentCountMap.set(ps.customerId, (shipmentCountMap.get(ps.customerId) || 0) + 1);
    });

    const topCustomersByShipments = customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: shipmentCountMap.get(c.id) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const revenueMap = new Map();
    partialShipments.forEach((ps) => {
      const revenue = ps.cost + (ps.extraCostAmount || 0) - (ps.discountAmount || 0);
      revenueMap.set(ps.customerId, (revenueMap.get(ps.customerId) || 0) + revenue);
    });

    const topCustomersByRevenue = customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        revenue: revenueMap.get(c.id) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const originMap = new Map();
    customers.forEach((c) => {
      const origin = c.origin || "Unknown";
      originMap.set(origin, (originMap.get(origin) || 0) + 1);
    });

    const customerOriginBreakdown = Array.from(originMap.entries()).map(([origin, count]) => ({
      origin,
      count,
    }));

    return NextResponse.json({
      totalCustomers,
      customerBalances,
      topCustomersByShipments,
      topCustomersByRevenue,
      customerOriginBreakdown,
    });
  } catch (err: any) {
    console.error("Error fetching customer stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
