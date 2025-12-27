"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { PlusCircle, MinusCircle } from "lucide-react"

interface Customer {
  id: number
  name: string
  phone: string | null
  address: string
  balance: number
}

export function BalanceButtons({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAddBalance = async () => {
    const amountStr = prompt("Enter amount to add to balance:")
    if (!amountStr) return
    const amount = Number.parseFloat(amountStr)
    if (isNaN(amount)) {
      toast({
        title: "Error",
        description: "Invalid amount",
        variant: "destructive",
      })
      return
    }
    setIsProcessing(true)
    try {
      // Create a FormData instance and append balanceIncrement
      const formData = new FormData()
      formData.append("balanceIncrement", amount.toString())
      // Call the new API without setting Content-Type header manually
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customer.id}`,
        {
          method: "PATCH",
          body: formData,
        }
      )
      if (!res.ok) throw new Error("Failed to add balance")
      toast({
        title: "Success",
        description: "Balance added successfully.",
      })
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add balance"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveBalance = async () => {
    const amountStr = prompt("Enter amount to remove from balance:")
    if (!amountStr) return
    const amount = Number.parseFloat(amountStr)
    if (isNaN(amount)) {
      toast({
        title: "Error",
        description: "Invalid amount",
        variant: "destructive",
      })
      return
    }
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("balanceIncrement", (-amount).toString())
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customer.id}`,
        {
          method: "PATCH",
          body: formData,
        }
      )
      if (!res.ok) throw new Error("Failed to remove balance")
      toast({
        title: "Success",
        description: "Balance updated successfully.",
      })
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove balance"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={handleAddBalance}
        disabled={isProcessing}
        className="bg-[#27AE60] text-white hover:bg-[#2ECC71]"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        Add Balance
      </Button>
      <Button
        variant="outline"
        onClick={handleRemoveBalance}
        disabled={isProcessing}
        className="bg-[#E74C3C] text-white hover:bg-[#C0392B]"
      >
        <MinusCircle className="w-4 h-4 mr-2" />
        Remove Balance
      </Button>
    </div>
  )
}
