import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, UserPlus } from "lucide-react"
import CustomersList from "./components/customers-list"
import AddCustomerDialog from "./components/add-customer-dialog"
import ProtectedRoute from "@/components/ProtectedRoute"

export default async function CustomersPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Customers</h1>
        <div className="flex justify-between items-center mb-6">
          <Card className="w-full bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold text-[#2C3E50]">
                <Users className="inline-block w-6 h-6 mr-2 text-[#3498DB]" />
                Customer Management
              </CardTitle>
              <AddCustomerDialog>
                <Button size="lg" className="bg-[#27AE60] hover:bg-[#2ECC71] text-white transition-colors">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Add Customer
                </Button>
              </AddCustomerDialog>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}>
                <CustomersList />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}

