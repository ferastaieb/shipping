"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Package, DollarSign, TrendingUp, Users, Calendar } from "lucide-react"
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
  LineChart,
  Line,
} from "recharts"

type PartialShipmentStats = {
  totalCount: number
  totalVolume: number
  totalCost: number
  totalDiscounts: number
  totalExtraCosts: number
  totalAmountPaid: number
  totalOutstanding: number
  byPaymentStatus: {
    status: string
    count: number
    amount: number
    volume: number
  }[]
  byCustomer: {
    customerId: number
    customerName: string
    count: number
    amount: number
    volume: number
  }[]
  byDestination: {
    destination: string
    count: number
    amount: number
    volume: number
  }[]
  packageStats: {
    totalCount: number
    byType: {
      type: string
      count: number
      weight: number
      volume: number
    }[]
  }
  monthlyTrends: {
    month: string
    year: number
    count: number
    volume: number
    cost: number
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

export default function PartialShipmentAnalytics() {
  const [stats, setStats] = useState<PartialShipmentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)

        // Add a cache control header to prevent excessive requests
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/partial-shipments`, {
          cache: "no-store",
        })

        if (!response.ok) throw new Error("Failed to fetch partial shipment data")
        const data = await response.json()
        setStats(data)
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching partial shipment stats:", err)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch once
    let isMounted = true
    if (isMounted) {
      fetchStats()
    }

    return () => {
      isMounted = false
    }
  }, [])

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
        <p>Error loading partial shipment data: {error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p>No partial shipment data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-md border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-blue-500" />
              Total Partial Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCount}</div>
            <p className="text-sm text-muted-foreground mt-1">{stats.packageStats.totalCount} packages total</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-l-4 border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-green-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCost.toFixed(2)} AED</div>
            <p className="text-sm text-muted-foreground mt-1">{stats.totalAmountPaid.toFixed(2)} AED collected</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-l-4 border-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-purple-500" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVolume.toFixed(2)} m³</div>
            <p className="text-sm text-muted-foreground mt-1">Across all partial shipments</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-l-4 border-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-amber-500" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalOutstanding.toFixed(2)} AED</div>
            <p className="text-sm text-muted-foreground mt-1">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
          <TabsTrigger value="destinations">By Destination</TabsTrigger>
          <TabsTrigger value="packages">Package Types</TabsTrigger>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partial Shipments by Payment Status</CardTitle>
              <CardDescription>Distribution of partial shipments by payment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byPaymentStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Shipments" fill="#3498DB">
                        {stats.byPaymentStatus.map((entry, index) => (
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
                        data={stats.byPaymentStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                      >
                        {stats.byPaymentStatus.map((entry, index) => (
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
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Status</CardTitle>
                <CardDescription>Total revenue by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byPaymentStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} AED`, "Amount"]} />
                      <Legend />
                      <Bar dataKey="amount" name="Amount (AED)" fill="#16A34A">
                        {stats.byPaymentStatus.map((entry, index) => (
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

            <Card>
              <CardHeader>
                <CardTitle>Volume by Payment Status</CardTitle>
                <CardDescription>Total volume by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byPaymentStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} m³`, "Volume"]} />
                      <Legend />
                      <Bar dataKey="volume" name="Volume (m³)" fill="#8B5CF6">
                        {stats.byPaymentStatus.map((entry, index) => (
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
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Partial Shipments by Customer
              </CardTitle>
              <CardDescription>Top customers by number of partial shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byCustomer.slice(0, 10).map((customer) => ({
                      ...customer,
                      // Create a truncated name for display
                      displayName: truncateName(customer.customerName),
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="displayName" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value}`, "Count"]}
                      labelFormatter={(label) => {
                        // Find the original customer name for the tooltip
                        const customer = stats.byCustomer.find((c) => truncateName(c.customerName) === label)
                        return customer ? customer.customerName : label
                      }}
                    />
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
                <CardTitle>Revenue by Customer</CardTitle>
                <CardDescription>Top customers by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byCustomer.slice(0, 10).map((customer) => ({
                        ...customer,
                        displayName: truncateName(customer.customerName),
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="displayName" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value).toFixed(2)} AED`, "Amount"]}
                        labelFormatter={(label) => {
                          const customer = stats.byCustomer.find((c) => truncateName(c.customerName) === label)
                          return customer ? customer.customerName : label
                        }}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Amount (AED)" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume by Customer</CardTitle>
                <CardDescription>Top customers by volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byCustomer.slice(0, 10).map((customer) => ({
                        ...customer,
                        displayName: truncateName(customer.customerName),
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="displayName" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value).toFixed(2)} m³`, "Volume"]}
                        labelFormatter={(label) => {
                          const customer = stats.byCustomer.find((c) => truncateName(c.customerName) === label)
                          return customer ? customer.customerName : label
                        }}
                      />
                      <Legend />
                      <Bar dataKey="volume" name="Volume (m³)" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="destinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partial Shipments by Destination</CardTitle>
              <CardDescription>Distribution of partial shipments across destinations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byDestination}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="destination" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Number of Shipments" fill="#3498DB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Destination</CardTitle>
                <CardDescription>Total revenue by destination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byDestination}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => (percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="destination"
                      >
                        {stats.byDestination.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} AED`, "Amount"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume by Destination</CardTitle>
                <CardDescription>Total volume by destination</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byDestination}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => (percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="volume"
                        nameKey="destination"
                      >
                        {stats.byDestination.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} m³`, "Volume"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Package Types Distribution</CardTitle>
              <CardDescription>Breakdown of packages by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.packageStats.byType}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="type" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Packages" fill="#F97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.packageStats.byType}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                      >
                        {stats.packageStats.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} packages`, ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weight by Package Type</CardTitle>
                <CardDescription>Total weight by package type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.packageStats.byType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} kg`, "Weight"]} />
                      <Legend />
                      <Bar dataKey="weight" name="Weight (kg)" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume by Package Type</CardTitle>
                <CardDescription>Total volume by package type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.packageStats.byType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} m³`, "Volume"]} />
                      <Legend />
                      <Bar dataKey="volume" name="Volume (m³)" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Partial shipment trends over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      name="Number of Shipments"
                      stroke="#3498DB"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cost"
                      name="Revenue (AED)"
                      stroke="#16A34A"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volume Trends</CardTitle>
              <CardDescription>Monthly volume trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} m³`, "Volume"]} />
                    <Legend />
                    <Bar dataKey="volume" name="Volume (m³)" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
