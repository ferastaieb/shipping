import { Card, CardContent } from "@/components/ui/card"
import { BalanceButtons } from "./BalanceButtons"
import { User, Phone, MapPin, Globe, FileText } from "lucide-react"

interface Customer {
  id: number
  name: string
  phone: string
  address: string
  balance: number
  origin?: string
  note?: {
    content: string
  }
}

export default function CustomerInfo({ customer }: { customer: Customer }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center mb-2">
              <User className="w-5 h-5 mr-2 text-[#3498DB]" />
              <strong className="text-[#2C3E50]">Name:</strong>
            </div>
            <p>{customer.name}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center mb-2">
              <Phone className="w-5 h-5 mr-2 text-[#3498DB]" />
              <strong className="text-[#2C3E50]">Phone:</strong>
            </div>
            <p>{customer.phone}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 mr-2 text-[#3498DB]" />
              <strong className="text-[#2C3E50]">Address:</strong>
            </div>
            <p>{customer.address}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center mb-2">
              <Globe className="w-5 h-5 mr-2 text-[#3498DB]" />
              <strong className="text-[#2C3E50]">Origin:</strong>
            </div>
            <p>{customer.origin || "N/A"}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-[#2C3E50] mb-2">Current Balance: ${customer.balance.toFixed(2)}</div>
          <p className="text-sm text-gray-600 mb-4">
            {customer.balance > 0 ? "This customer has outstanding payments." : "This customer's balance is clear."}
          </p>
          <BalanceButtons customer={customer} />
        </CardContent>
      </Card>
      <Card className="bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center mb-2">
            <FileText className="w-5 h-5 mr-2 text-[#3498DB]" />
            <div className="text-xl font-bold text-[#2C3E50]">Note Preview</div>
          </div>
          <p className="text-sm text-gray-600">
            {customer.note
              ? customer.note.content.substring(0, 100) + (customer.note.content.length > 100 ? "..." : "")
              : "No note available"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

