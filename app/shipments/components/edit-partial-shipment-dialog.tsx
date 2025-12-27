"use client"

// edit-partial-shipment-dialog.tsx
import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { PartialShipment, Customer } from "../types/shipping"

interface EditPartialShipmentDialogProps {
  shipmentId: number
  partial: PartialShipment | null
  customers: Customer[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

// Define a type for the form data with string indexing
interface FormDataType {
  [key: string]: string | number | boolean | null | undefined
}

const EditPartialShipmentDialog: React.FC<EditPartialShipmentDialogProps> = ({
  shipmentId,
  partial,
  open,
  onOpenChange,
  onSaved,
}) => {
  const [formData, setFormData] = useState<FormDataType>({})
  const [paymentResponsibility, setPaymentResponsibility] = useState("")
  const [packages, setPackages] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (partial) {
      // Convert partial to a proper FormDataType object
      const initialFormData: FormDataType = {
        receiverName: partial.receiverName || "",
        receiverPhone: partial.receiverPhone || "",
        receiverAddress: partial.receiverAddress || "",
        cost: partial.cost?.toString() || "",
        amountPaid: partial.amountPaid?.toString() || "",
        paymentStatus: partial.paymentStatus || "unpaid",
        extraCostReason: partial.extraCostReason || "",
        extraCostAmount: partial.extraCostAmount?.toString() || "",
      }

      setFormData(initialFormData)
      setPaymentResponsibility(partial.paymentResponsibility || "customer")
      setPackages(partial.packages || [])
      setItems(partial.items || [])
    }
  }, [partial])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handlePaymentResponsibilityChange = (value: string) => {
    setPaymentResponsibility(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partial) return
    setIsLoading(true)
    try {
      const fd = new FormData()
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          fd.append(k, v.toString())
        }
      })
      fd.append("paymentResponsibility", paymentResponsibility)
      fd.append("packages", JSON.stringify(packages))
      fd.append("items", JSON.stringify(items))

      const res = await fetch(`/api/shipments/${shipmentId}/partial-shipments/${partial.id}/edit`, {
        method: "PUT",
        body: fd,
      })
      if (!res.ok) throw new Error("Update failed")

      // Close dialog first
      onOpenChange(false)

      // Then show success message
      toast({ title: "Saved", description: "Partial shipment updated." })

      // Finally call the onSaved callback
      setTimeout(() => {
        onSaved()
      }, 100)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Partial Shipment #{partial?.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="grid gap-2 py-2">
              <Label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}</Label>
              <Input id={key} name={key} value={value?.toString() || ""} onChange={handleChange} />
            </div>
          ))}

          <div className="grid gap-2 py-2">
            <Label htmlFor="paymentResponsibility">Payment Responsibility</Label>
            <Select onValueChange={handlePaymentResponsibilityChange} value={paymentResponsibility}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment responsibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="receiver">Receiver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditPartialShipmentDialog
