import { NextResponse } from "next/server";
import { listPartialShipments } from "@/lib/db";

export async function GET() {
  try {
    const partialShipments = await listPartialShipments();

    const totalCost = partialShipments.reduce((sum, ps) => sum + (ps.cost || 0), 0);
    const totalDiscounts = partialShipments.reduce((sum, ps) => sum + (ps.discountAmount || 0), 0);
    const totalExtraCosts = partialShipments.reduce(
      (sum, ps) => sum + (ps.extraCostAmount || 0),
      0
    );
    const totalAmountPaid = partialShipments.reduce((sum, ps) => sum + (ps.amountPaid || 0), 0);
    const totalOutstanding = totalCost + totalExtraCosts - totalDiscounts - totalAmountPaid;

    const paymentStatusMap = new Map();
    partialShipments.forEach((ps) => {
      const status = ps.paymentStatus || "unknown";
      if (!paymentStatusMap.has(status)) {
        paymentStatusMap.set(status, { count: 0, amount: 0 });
      }
      const current = paymentStatusMap.get(status);
      current.count += 1;
      current.amount += ps.cost || 0;
      paymentStatusMap.set(status, current);
    });

    const paymentStatusBreakdown = Array.from(paymentStatusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
    }));

    return NextResponse.json({
      totalCost,
      totalDiscounts,
      totalExtraCosts,
      totalAmountPaid,
      totalOutstanding,
      paymentStatusBreakdown,
    });
  } catch (err: any) {
    console.error("Error fetching financial stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
