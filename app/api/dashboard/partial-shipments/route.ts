import { NextResponse } from "next/server";
import {
  listCustomers,
  listPackageDetails,
  listPartialShipmentItems,
  listPartialShipments,
  listShipments,
} from "@/lib/db";

export async function GET() {
  try {
    const [partialShipments, shipments, customers, packages, items] = await Promise.all([
      listPartialShipments(),
      listShipments(),
      listCustomers(),
      listPackageDetails(),
      listPartialShipmentItems(),
    ]);

    const shipmentMap = new Map(shipments.map((s) => [s.id, s]));
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const packagesByPartial = new Map();
    packages.forEach((pkg) => {
      if (!packagesByPartial.has(pkg.partialShipmentId)) {
        packagesByPartial.set(pkg.partialShipmentId, []);
      }
      packagesByPartial.get(pkg.partialShipmentId).push(pkg);
    });

    const itemsByPartial = new Map();
    items.forEach((itm) => {
      if (!itemsByPartial.has(itm.partialShipmentId)) {
        itemsByPartial.set(itm.partialShipmentId, []);
      }
      itemsByPartial.get(itm.partialShipmentId).push(itm);
    });

    const partialsWithDetails = partialShipments.map((ps) => ({
      ...ps,
      customer: customerMap.get(ps.customerId) || null,
      packages: packagesByPartial.get(ps.id) || [],
      items: itemsByPartial.get(ps.id) || [],
      shipment: shipmentMap.get(ps.shipmentId) || null,
    }));

    const totalCount = partialsWithDetails.length;
    const totalVolume = partialsWithDetails.reduce((sum, ps) => sum + (ps.volume || 0), 0);
    const totalCost = partialsWithDetails.reduce((sum, ps) => sum + (ps.cost || 0), 0);
    const totalDiscounts = partialsWithDetails.reduce(
      (sum, ps) => sum + (ps.discountAmount || 0),
      0
    );
    const totalExtraCosts = partialsWithDetails.reduce(
      (sum, ps) => sum + (ps.extraCostAmount || 0),
      0
    );
    const totalAmountPaid = partialsWithDetails.reduce(
      (sum, ps) => sum + (ps.amountPaid || 0),
      0
    );
    const totalOutstanding = totalCost + totalExtraCosts - totalDiscounts - totalAmountPaid;

    const paymentStatusMap = new Map();
    partialsWithDetails.forEach((ps) => {
      const status = ps.paymentStatus || "unknown";
      if (!paymentStatusMap.has(status)) {
        paymentStatusMap.set(status, { count: 0, amount: 0, volume: 0 });
      }
      const current = paymentStatusMap.get(status);
      current.count += 1;
      current.amount += ps.cost || 0;
      current.volume += ps.volume || 0;
      paymentStatusMap.set(status, current);
    });

    const byPaymentStatus = Array.from(paymentStatusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
      volume: data.volume,
    }));

    const byCustomerMap = new Map();
    partialsWithDetails.forEach((ps) => {
      const customer = ps.customer;
      if (!customer) {
        return;
      }
      if (!byCustomerMap.has(customer.id)) {
        byCustomerMap.set(customer.id, { name: customer.name, count: 0, amount: 0, volume: 0 });
      }
      const current = byCustomerMap.get(customer.id);
      current.count += 1;
      current.amount += ps.cost || 0;
      current.volume += ps.volume || 0;
      byCustomerMap.set(customer.id, current);
    });

    const byCustomer = Array.from(byCustomerMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        count: data.count,
        amount: data.amount,
        volume: data.volume,
      }))
      .sort((a, b) => b.count - a.count);

    const destinationMap = new Map();
    partialsWithDetails.forEach((ps) => {
      const destination = ps.shipment?.destination;
      if (!destination) {
        return;
      }
      if (!destinationMap.has(destination)) {
        destinationMap.set(destination, { count: 0, amount: 0, volume: 0 });
      }
      const current = destinationMap.get(destination);
      current.count += 1;
      current.amount += ps.cost || 0;
      current.volume += ps.volume || 0;
      destinationMap.set(destination, current);
    });

    const byDestination = Array.from(destinationMap.entries())
      .map(([destination, data]) => ({
        destination,
        count: data.count,
        amount: data.amount,
        volume: data.volume,
      }))
      .sort((a, b) => b.count - a.count);

    const packageCount = partialsWithDetails.reduce(
      (sum, ps) => sum + (ps.packages?.length || 0),
      0
    );

    const packageTypes = new Map();
    partialsWithDetails.forEach((ps) => {
      ps.packages?.forEach((pkg) => {
        const type = pkg.typeOfPackage || "Unknown";
        if (!packageTypes.has(type)) {
          packageTypes.set(type, { count: 0, weight: 0, volume: 0 });
        }
        const current = packageTypes.get(type);
        const units = pkg.units || 1;
        current.count += units;
        current.weight += (pkg.weight || 0) * units;
        current.volume += (pkg.length * pkg.width * pkg.height) * units;
        packageTypes.set(type, current);
      });
    });

    const byPackageType = Array.from(packageTypes.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        weight: data.weight,
        volume: data.volume,
      }))
      .sort((a, b) => b.count - a.count);

    const now = new Date();
    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const month = new Date();
      month.setMonth(now.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthName = month.toLocaleString("default", { month: "short" });

      const monthShipments = partialsWithDetails.filter((ps) => {
        const shipmentDate = ps.shipment?.dateCreated ? new Date(ps.shipment.dateCreated) : null;
        return shipmentDate && shipmentDate >= monthStart && shipmentDate <= monthEnd;
      });

      monthlyData.unshift({
        month: monthName,
        year: month.getFullYear(),
        count: monthShipments.length,
        volume: monthShipments.reduce((sum, ps) => sum + (ps.volume || 0), 0),
        cost: monthShipments.reduce((sum, ps) => sum + (ps.cost || 0), 0),
      });
    }

    return NextResponse.json({
      totalCount,
      totalVolume,
      totalCost,
      totalDiscounts,
      totalExtraCosts,
      totalAmountPaid,
      totalOutstanding,
      byPaymentStatus,
      byCustomer,
      byDestination,
      packageStats: {
        totalCount: packageCount,
        byType: byPackageType,
      },
      monthlyTrends: monthlyData,
    });
  } catch (err: any) {
    console.error("Error fetching partial shipment stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
