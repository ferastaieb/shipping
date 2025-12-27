"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BarChart3, DollarSign, Users, Package, PlusCircle, Truck } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import OpenShipments from "@/components/open-shipments"
import DashboardStats from "@/components/dashboard-stats"
import PartialShipmentAnalytics from "@/components/partial-shipment-analytics"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useState, useEffect } from "react"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 pb-16">
        <div className="mb-6 pt-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Shipping Management Dashboard</h1>
          <p className="text-sm text-white/70 mt-1">Track batches, revenue, and customer activity at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link href="/new-shipment" className="block">
            <Button className="w-full h-24 text-lg bg-teal-500 hover:bg-teal-600 transition-all shadow-lg hover:shadow-xl rounded-xl">
              <span className="flex items-center gap-3">
                <PlusCircle className="h-5 w-5" />
                New Batch
              </span>
            </Button>
          </Link>
          <Link href="/customers" className="block">
            <Button className="w-full h-24 text-lg bg-orange-500 hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl rounded-xl">
              <span className="flex items-center gap-3">
                <Users className="h-5 w-5" />
                Customers
              </span>
            </Button>
          </Link>
          <Link href="/shipments/closed" className="block">
            <Button className="w-full h-24 text-lg bg-blue-500 hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl rounded-xl">
              <span className="flex items-center gap-3">
                <Truck className="h-5 w-5" />
                Closed Batches
              </span>
            </Button>
          </Link>
          {/* <Link href="/shipments" className="block">
            <Button className="w-full h-24 text-lg bg-purple-500 hover:bg-purple-600 transition-colors">
              All Shipments
            </Button>
          </Link> */}
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          <Card className="bg-white text-gray-800 shadow-lg border-l-4 border-teal-500">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-teal-500" />
                Shipment Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
              >
                <DashboardStats />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="bg-white text-gray-800 shadow-lg border-l-4 border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-orange-500" />
                Open Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Loader2 className="mr-2 h-4 w-4 animate-spin" />}>
                <OpenShipments />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white text-gray-800 shadow-lg border-l-4 border-blue-500 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-blue-500" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              <div className="p-6">
                <Tabs defaultValue="financial" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                  </TabsList>
                  <TabsContent value="financial">
                    <FinancialOverview />
                  </TabsContent>
                  <TabsContent value="customers">
                    <CustomerOverview />
                  </TabsContent>
                </Tabs>
              </div>
            </Suspense>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800 shadow-lg border-l-4 border-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5 text-purple-500" />
              Partial Shipment Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              <PartialShipmentAnalytics />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

// Separate components for financial and customer overviews
function FinancialOverview() {
  const [financialData, setFinancialData] = useState<{
    totalCost: number
    totalDiscounts: number
    totalExtraCosts: number
    totalOutstanding: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Move async logic inside useEffect
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/financial`)
        if (response.ok) {
          const data = await response.json()
          setFinancialData(data)
        }
      } catch (error) {
        console.error("Error fetching financial data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin mx-auto" />
  }

  if (!financialData) {
    return <p className="text-center">No financial data available</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">Total Revenue</p>
        <p className="text-2xl font-bold text-gray-800">{financialData.totalCost.toFixed(2)} AED</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">Total Discounts</p>
        <p className="text-2xl font-bold text-green-600">{financialData.totalDiscounts.toFixed(2)} AED</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">Extra Costs</p>
        <p className="text-2xl font-bold text-amber-600">{financialData.totalExtraCosts.toFixed(2)} AED</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">Outstanding Balance</p>
        <p className="text-2xl font-bold text-red-600">{financialData.totalOutstanding.toFixed(2)} AED</p>
      </div>
    </div>
  )
}

function CustomerOverview() {
  const [customerData, setCustomerData] = useState<{
    totalCustomers: number
    customerBalances?: { id: number; name: string; balance: number }[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Move async logic inside useEffect
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/stats`)
        if (response.ok) {
          const data = await response.json()
          setCustomerData(data)
        } else {
          // Fallback to basic customer data
          const basicResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`)
          if (basicResponse.ok) {
            const customers = await basicResponse.json()
            setCustomerData({
              totalCustomers: customers.length,
              customerBalances: customers
                .map((c: any) => ({ id: c.id, name: c.name, balance: c.balance || 0 }))
                .sort((a: any, b: any) => b.balance - a.balance)
                .slice(0, 5),
            })
          }
        }
      } catch (error) {
        console.error("Error fetching customer data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin mx-auto" />
  }

  if (!customerData) {
    return <p className="text-center">No customer data available</p>
  }

  return (
    <div>
      <div className="mb-4 bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">Total Customers</p>
        <p className="text-2xl font-bold text-gray-800">{customerData.totalCustomers}</p>
      </div>

      <h3 className="text-lg font-medium mb-2">Top Customers by Balance</h3>
      <div className="space-y-2">
        {customerData.customerBalances?.slice(0, 5).map((customer) => (
          <div key={customer.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
            <span className="font-medium truncate max-w-[200px]" title={customer.name}>
              {customer.name}
            </span>
            <span className="text-blue-600 font-bold ml-2">{customer.balance.toFixed(2)} AED</span>
          </div>
        ))}
      </div>
    </div>
  )
}
