"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, TrendingUp, Package, Truck, MapPin, DollarSign, Users, CreditCard, Percent } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

type ShipmentStats = {
  shipments: any[]
  statsByStatus: {
    isOpen: boolean
    _count: { _all: number }
    _sum: { totalWeight: number; totalVolume: number }
  }[]
  statsByDestination: {
    destination: string
    _count: { _all: number }
    _sum: { totalWeight: number; totalVolume: number }
  }[]
  partialShipmentStats?: {
    totalCount: number
    byPaymentStatus: {
      status: string
      count: number
    }[]
    byCustomer: {
      customerId: number
      customerName: string
      count: number
    }[]
  }
}

type FinancialStats = {
  totalCost: number
  totalDiscounts: number
  totalExtraCosts: number
  totalAmountPaid: number
  totalOutstanding: number
  paymentStatusBreakdown: {
    status: string
    count: number
    amount: number
  }[]
}

type CustomerStats = {
  totalCustomers: number
  topCustomersByShipments: {
    id: number
    name: string
    count: number
  }[]
  topCustomersByRevenue: {
    id: number
    name: string
    revenue: number
  }[]
  customerOriginBreakdown: {
    origin: string
    count: number
  }[]
  customerBalances: {
    id: number
    name: string
    balance: number
  }[]
}

// Add this helper function at the top of the file, after the type definitions
const truncateName = (name: string, maxLength = 13) => {
  if (!name) return "Unknown"
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#d0ed57"]
const PAYMENT_STATUS_COLORS = {
  paid: "#16A34A",
  unpaid: "#EF4444",
  partially_paid: "#F59E0B",
}

export default function DashboardStats() {
  const [stats, setStats] = useState<ShipmentStats | null>(null)
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null)
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setIsLoading(true)

        // Fetch shipment stats
        const shipmentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`)
        if (!shipmentResponse.ok) throw new Error("Failed to fetch dashboard data")
        const shipmentData = await shipmentResponse.json()
        setStats(shipmentData)

        // Fetch financial stats
        const financialResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/financial`)
        if (financialResponse.ok) {
          const financialData = await financialResponse.json()
          setFinancialStats(financialData)
        }

        // Fetch customer stats
        const customerResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/customers`)
        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          setCustomerStats(customerData)
        } else {
          // If the customer stats endpoint doesn't exist, fetch basic customer data
          const customersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`)
          if (customersResponse.ok) {
            const customers = await customersResponse.json()

            // Process customer data to create basic stats
            const basicCustomerStats = {
              totalCustomers: customers.length,
              topCustomersByShipments: [],
              topCustomersByRevenue: [],
              customerOriginBreakdown: [],
              customerBalances: customers
                .map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  balance: c.balance || 0,
                }))
                .sort((a: any, b: any) => b.balance - a.balance)
                .slice(0, 10),
            }

            setCustomerStats(basicCustomerStats)
          }
        }
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching dashboard stats:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllStats()
  }, [])

  // Calculate financial stats from shipment data if the financial API doesn't exist
  useEffect(() => {
    if (stats && !financialStats && stats.shipments) {
      const calculatedFinancialStats = calculateFinancialStats(stats.shipments)
      setFinancialStats(calculatedFinancialStats)
    }
  }, [stats, financialStats])

  const calculateFinancialStats = (shipments: any[]): FinancialStats => {
    let totalCost = 0
    let totalDiscounts = 0
    let totalExtraCosts = 0
    let totalAmountPaid = 0

    const paymentStatusMap: Record<string, { count: number; amount: number }> = {}

    // Flatten all partial shipments
    const partialShipments = shipments.flatMap((shipment) => shipment.partialShipments || [])

    partialShipments.forEach((partial) => {
      if (partial) {
        totalCost += partial.cost || 0
        totalDiscounts += partial.discountAmount || 0
        totalExtraCosts += partial.extraCostAmount || 0
        totalAmountPaid += partial.amountPaid || 0

        const status = partial.paymentStatus || "unknown"
        if (!paymentStatusMap[status]) {
          paymentStatusMap[status] = { count: 0, amount: 0 }
        }
        paymentStatusMap[status].count += 1
        paymentStatusMap[status].amount += partial.cost || 0
      }
    })

    const totalOutstanding = totalCost + totalExtraCosts - totalDiscounts - totalAmountPaid

    const paymentStatusBreakdown = Object.entries(paymentStatusMap).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
    }))

    return {
      totalCost,
      totalDiscounts,
      totalExtraCosts,
      totalAmountPaid,
      totalOutstanding,
      paymentStatusBreakdown,
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>Error loading dashboard data: {error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p>No data available</p>
      </div>
    )
  }

  // Format data for charts
  const statusData = stats.statsByStatus.map((stat) => ({
    name: stat.isOpen ? "Open" : "Closed",
    count: stat._count._all,
    weight: Number.parseFloat(stat._sum.totalWeight.toFixed(2)),
    volume: Number.parseFloat(stat._sum.totalVolume.toFixed(2)),
  }))

  const destinationData = stats.statsByDestination
    .sort((a, b) => b._count._all - a._count._all)
    .map((stat) => ({
      name: stat.destination,
      count: stat._count._all,
      weight: Number.parseFloat(stat._sum.totalWeight.toFixed(2)),
      volume: Number.parseFloat(stat._sum.totalVolume.toFixed(2)),
    }))

  // Calculate totals
  const totalShipments = stats.statsByStatus.reduce((acc, stat) => {
    return acc + (stat._count && stat._count._all ? stat._count._all : 0)
  }, 0)

  const totalWeight = stats.statsByStatus.reduce((acc, stat) => {
    return acc + (stat._sum && stat._sum.totalWeight ? stat._sum.totalWeight : 0)
  }, 0)

  const totalVolume = stats.statsByStatus.reduce((acc, stat) => {
    return acc + (stat._sum && stat._sum.totalVolume ? stat._sum.totalVolume : 0)
  }, 0)

  // Get open shipments count with null checks
  const openShipments = stats.statsByStatus.find((stat) => stat.isOpen)?._count?._all || 0
  const closedShipments = stats.statsByStatus.find((stat) => !stat.isOpen)?._count?._all || 0

  // Format financial data for charts
  const paymentStatusData = financialStats?.paymentStatusBreakdown || []

  // Format customer data for charts
  const customerBalanceData = customerStats?.customerBalances || []
  const topCustomersByShipments = customerStats?.topCustomersByShipments || []
  const topCustomersByRevenue = customerStats?.topCustomersByRevenue || []
  const customerOriginData = customerStats?.customerOriginBreakdown || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-md border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-blue-500" />
              Total Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalShipments}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {openShipments} open, {closedShipments} closed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-l-4 border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
              Total Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWeight.toFixed(2)} kg</div>
            <p className="text-sm text-muted-foreground mt-1">Across all shipments</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-l-4 border-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Truck className="mr-2 h-5 w-5 text-purple-500" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalVolume.toFixed(2)} m³</div>
            <p className="text-sm text-muted-foreground mt-1">Across all shipments</p>
          </CardContent>
        </Card>

        {financialStats && (
          <Card className="bg-white shadow-md border-l-4 border-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-amber-500" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{financialStats.totalCost.toFixed(2)} AED</div>
              <p className="text-sm text-muted-foreground mt-1">
                {financialStats.totalAmountPaid.toFixed(2)} AED collected
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="destination">By Destination</TabsTrigger>
          <TabsTrigger value="partialShipments">Partial Shipments</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipments by Status</CardTitle>
              <CardDescription>Distribution of shipments by their current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Shipments" fill="#3498DB" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} shipments`, "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weight Distribution</CardTitle>
                <CardDescription>Total weight by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} kg`, "Weight"]} />
                      <Bar dataKey="weight" name="Weight (kg)" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume Distribution</CardTitle>
                <CardDescription>Total volume by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} m³`, "Volume"]} />
                      <Bar dataKey="volume" name="Volume (m³)" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="destination" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Shipments by Destination
              </CardTitle>
              <CardDescription>Distribution of shipments across different destinations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={destinationData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Number of Shipments" fill="#F97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weight by Destination</CardTitle>
                <CardDescription>Total weight shipped to each destination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={destinationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => (percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="weight"
                      >
                        {destinationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} kg`, "Weight"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume by Destination</CardTitle>
                <CardDescription>Total volume shipped to each destination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={destinationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => (percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="volume"
                      >
                        {destinationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} m³`, "Volume"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="partialShipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Partial Shipments Overview
              </CardTitle>
              <CardDescription>Analysis of individual shipment packages</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.partialShipmentStats ? (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.partialShipmentStats.byPaymentStatus}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Number of Shipments" fill="#3498DB">
                          {stats.partialShipmentStats.byPaymentStatus.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PAYMENT_STATUS_COLORS[entry.status as keyof typeof PAYMENT_STATUS_COLORS] ||
                                COLORS[index % COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.partialShipmentStats.byPaymentStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="status"
                        >
                          {stats.partialShipmentStats.byPaymentStatus.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PAYMENT_STATUS_COLORS[entry.status as keyof typeof PAYMENT_STATUS_COLORS] ||
                                COLORS[index % COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} shipments`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  <p>No partial shipment data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {stats.partialShipmentStats?.byCustomer && stats.partialShipmentStats.byCustomer.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Partial Shipments by Customer</CardTitle>
                <CardDescription>Distribution of partial shipments across customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.partialShipmentStats.byCustomer.slice(0, 10)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="customerName" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Partial Shipments" fill="#F97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          {financialStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{financialStats.totalCost.toFixed(2)} AED</div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Percent className="mr-2 h-5 w-5 text-emerald-600" />
                      Total Discounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{financialStats.totalDiscounts.toFixed(2)} AED</div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <CreditCard className="mr-2 h-5 w-5 text-blue-600" />
                      Amount Collected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{financialStats.totalAmountPaid.toFixed(2)} AED</div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-red-600" />
                      Outstanding Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{financialStats.totalOutstanding.toFixed(2)} AED</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                  <CardDescription>Breakdown of revenue, costs, and payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Revenue",
                            value: financialStats.totalCost,
                            fill: "#16A34A",
                          },
                          {
                            name: "Extra Costs",
                            value: financialStats.totalExtraCosts,
                            fill: "#F97316",
                          },
                          {
                            name: "Discounts",
                            value: financialStats.totalDiscounts,
                            fill: "#3B82F6",
                          },
                          {
                            name: "Collected",
                            value: financialStats.totalAmountPaid,
                            fill: "#8B5CF6",
                          },
                          {
                            name: "Outstanding",
                            value: financialStats.totalOutstanding,
                            fill: "#EF4444",
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} AED`, ""]} />
                        <Bar dataKey="value" name="Amount (AED)" fill="#8884d8">
                          {[
                            { name: "Revenue", fill: "#16A34A" },
                            { name: "Extra Costs", fill: "#F97316" },
                            { name: "Discounts", fill: "#3B82F6" },
                            { name: "Collected", fill: "#8B5CF6" },
                            { name: "Outstanding", fill: "#EF4444" },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Status Distribution</CardTitle>
                    <CardDescription>Breakdown of shipments by payment status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="count"
                          >
                            {paymentStatusData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  PAYMENT_STATUS_COLORS[entry.status as keyof typeof PAYMENT_STATUS_COLORS] ||
                                  COLORS[index % COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => [`${value} shipments`, props.payload.status]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Payment Status</CardTitle>
                    <CardDescription>Total revenue breakdown by payment status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} AED`, "Amount"]} />
                          <Legend />
                          <Bar dataKey="amount" name="Amount (AED)" fill="#8884d8">
                            {paymentStatusData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  PAYMENT_STATUS_COLORS[entry.status as keyof typeof PAYMENT_STATUS_COLORS] ||
                                  COLORS[index % COLORS.length]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Composition</CardTitle>
                  <CardDescription>Breakdown of revenue components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          {
                            name: "Base Revenue",
                            base: financialStats.totalCost,
                            extra: financialStats.totalExtraCosts,
                            discount: financialStats.totalDiscounts,
                            total:
                              financialStats.totalCost + financialStats.totalExtraCosts - financialStats.totalDiscounts,
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} AED`, ""]} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="base"
                          stackId="1"
                          stroke="#16A34A"
                          fill="#16A34A"
                          name="Base Revenue"
                        />
                        <Area
                          type="monotone"
                          dataKey="extra"
                          stackId="1"
                          stroke="#F97316"
                          fill="#F97316"
                          name="Extra Costs"
                        />
                        <Area
                          type="monotone"
                          dataKey="discount"
                          stackId="2"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          name="Discounts"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center p-8">
              <p>No financial data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {customerStats ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Customer Overview
                  </CardTitle>
                  <CardDescription>Total customers: {customerStats.totalCustomers}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={customerBalanceData.slice(0, 10).map((customer) => ({
                            ...customer,
                            displayName: truncateName(customer.name),
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="displayName" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value) => [`${Number(value).toFixed(2)} AED`, "Balance"]}
                            labelFormatter={(label) => {
                              const customer = customerBalanceData.find((c) => truncateName(c.name) === label)
                              return customer ? customer.name : label
                            }}
                          />
                          <Legend />
                          <Bar dataKey="balance" name="Balance (AED)" fill="#8B5CF6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="h-80">
                      {topCustomersByShipments.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={topCustomersByShipments.map((customer) => ({
                                ...customer,
                                displayName: truncateName(customer.name),
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                              }
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="displayName"
                            >
                              {topCustomersByShipments.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [`${value} shipments`, "Count"]}
                              labelFormatter={(label) => {
                                const customer = topCustomersByShipments.find((c) => truncateName(c.name) === label)
                                return customer ? customer.name : label
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500">No shipment count data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {topCustomersByRevenue.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers by Revenue</CardTitle>
                    <CardDescription>Customers generating the most revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topCustomersByRevenue.map((customer) => ({
                            ...customer,
                            displayName: truncateName(customer.name),
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="displayName" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value) => [`${Number(value).toFixed(2)} AED`, "Revenue"]}
                            labelFormatter={(label) => {
                              const customer = topCustomersByRevenue.find((c) => truncateName(c.name) === label)
                              return customer ? customer.name : label
                            }}
                          />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue (AED)" fill="#16A34A" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {customerOriginData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Origin Distribution</CardTitle>
                    <CardDescription>Breakdown of customers by origin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={customerOriginData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name || "Unknown"}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {customerOriginData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} customers`, "Count"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center p-8">
              <p>No customer data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
