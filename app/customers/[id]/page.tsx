import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, Truck, FileText, Edit } from "lucide-react"
import CustomerInfo from "./components/customer-info"
import CustomerShipments from "./components/customer-shipments"
import CustomerNotes from "./components/customer-notes"
import EditCustomerDialog from "./components/edit-customer-dialog"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "@/components/ProtectedRoute"

async function getCustomer(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, { cache: "no-store" })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error("Failed to fetch customer")
  }
  return res.json()
}

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer) {
    notFound()
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Customer Details</h1>
        <Card className="bg-white shadow-lg mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold text-[#2C3E50] flex items-center">
              <User className="inline-block w-6 h-6 mr-2 text-[#3498DB]" />
              {customer.name}
            </CardTitle>
            <EditCustomerDialog customer={customer}>
              <Button variant="outline" className="bg-[#3498DB] text-white hover:bg-[#2980B9]">
                <Edit className="mr-2 h-4 w-4" />
                Edit Customer
              </Button>
            </EditCustomerDialog>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#ECF0F1]">
                <TabsTrigger value="info" className="data-[state=active]:bg-[#1ABC9C] data-[state=active]:text-white">
                  <User className="w-4 h-4 mr-2" />
                  Customer Info
                </TabsTrigger>
                <TabsTrigger
                  value="shipments"
                  className="data-[state=active]:bg-[#1ABC9C] data-[state=active]:text-white"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Shipments
                </TabsTrigger>
                <TabsTrigger value="notes" className="data-[state=active]:bg-[#1ABC9C] data-[state=active]:text-white">
                  <FileText className="w-4 h-4 mr-2" />
                  Notes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}>
                  <CustomerInfo customer={customer} />
                </Suspense>
              </TabsContent>
              <TabsContent value="shipments">
                <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}>
                  <CustomerShipments customerId={customer.id} />
                </Suspense>
              </TabsContent>
              <TabsContent value="notes">
                <CustomerNotes customer={customer} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

