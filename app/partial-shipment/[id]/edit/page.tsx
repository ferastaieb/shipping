"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Loader2, Package, Truck, FileText, CreditCard, ArrowLeft } from "lucide-react"
import ProtectedRoute from "@/components/ProtectedRoute"
import ReactSelect from "react-select"
import type { PartialShipment, Customer } from "../../../shipments/types/shipping"

interface FormData {
  customerId: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  cost: string
  amountPaid: string
  paymentStatus: string
  extraCostReason: string
  extraCostAmount: string
}

interface FormPackageDetail {
  id?: number
  length: string
  width: string
  height: string
  weight: string
  units: string
  typeOfPackage: string
  description: string
  costType: string
  totalCost: string
  customType?: string
}

interface FormShipmentItem {
  id?: number
  weight: string
  origin: string
  hscode: string
  overallPrice: string
  unit: string
  quantity: string
  description: string
  priceByUnit: string
}

export default function EditPartialShipmentPage() {
  const router = useRouter()
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [partialShipment, setPartialShipment] = useState<PartialShipment | null>(null)

  // Form data
  const [formData, setFormData] = useState<FormData>({
    customerId: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    cost: "",
    amountPaid: "",
    paymentStatus: "unpaid",
    extraCostReason: "",
    extraCostAmount: "",
  })

  // Payment responsibility (when paymentStatus !== "paid")
  const [paymentResponsibility, setPaymentResponsibility] = useState("customer")

  // Package details
  const [packageDetails, setPackageDetails] = useState<FormPackageDetail[]>([
    {
      length: "",
      width: "",
      height: "",
      weight: "",
      units: "1",
      typeOfPackage: "package",
      description: "",
      costType: "CPM",
      totalCost: "",
    },
  ])

  // Shipment items
  const [items, setItems] = useState<FormShipmentItem[]>([
    {
      weight: "",
      origin: "",
      hscode: "",
      overallPrice: "",
      unit: "",
      quantity: "",
      description: "",
      priceByUnit: "",
    },
  ])

  // Note information
  const [noteContent, setNoteContent] = useState("")
  const [noteImages, setNoteImages] = useState<File[]>([])
  const [existingNoteImages, setExistingNoteImages] = useState<string[]>([])

  useEffect(() => {
    if (partialShipment) {
      // Populate form data
      setFormData({
        customerId: partialShipment.customerId.toString(),
        receiverName: partialShipment.receiverName || "",
        receiverPhone: partialShipment.receiverPhone || "",
        receiverAddress: partialShipment.receiverAddress || "",
        cost: partialShipment.cost.toString(),
        amountPaid: partialShipment.amountPaid.toString(),
        paymentStatus: partialShipment.paymentStatus || "unpaid",
        extraCostReason: partialShipment.extraCostReason || "",
        extraCostAmount: partialShipment.extraCostAmount?.toString() || "",
      })

      // Set payment responsibility
      if (partialShipment.paymentResponsibility) {
        setPaymentResponsibility(partialShipment.paymentResponsibility)
      }

      // Set package details
      if (partialShipment.packages && partialShipment.packages.length > 0) {
        const formattedPackages = partialShipment.packages.map((pkg) => ({
          id: pkg.id,
          length: pkg.length.toString(),
          width: pkg.width.toString(),
          height: pkg.height.toString(),
          weight: pkg.weight.toString(),
          units: pkg.units?.toString() || "1",
          typeOfPackage: pkg.typeOfPackage,
          description: pkg.description || "",
          costType: pkg.costType || "CPM",
          totalCost: pkg.totalCost?.toString() || "",
          customType: pkg.typeOfPackage === "other" ? pkg.typeOfPackage : undefined,
        }))
        setPackageDetails(formattedPackages)
      }

      // Set shipment items
      if (partialShipment.items && partialShipment.items.length > 0) {
        const formattedItems = partialShipment.items.map((item) => ({
          id: item.id,
          weight: item.weight.toString(),
          origin: item.origin,
          hscode: item.hscode,
          overallPrice: item.value?.toString() || "",
          unit: item.unit || "",
          quantity: item.quantity?.toString() || "",
          description: item.description || "",
          priceByUnit: item.priceByUnit?.toString() || "",
        }))
        setItems(formattedItems)
      }

      // Set note content
      if (partialShipment.note) {
        setNoteContent(partialShipment.note.content || "")
        if (partialShipment.note.images) {
          setExistingNoteImages(partialShipment.note.images)
        }
      }
    }
  }, [partialShipment])

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`)
      if (!response.ok) throw new Error("Failed to fetch customers")
      const data = await response.json()
      setCustomers(data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load customers. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [])

  const fetchPartialShipment = useCallback(async () => {
    try {
      setIsFetching(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partial-shipments/${id}`)
      if (!response.ok) throw new Error("Failed to fetch partial shipment")
      const data = await response.json()
      setPartialShipment(data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load partial shipment. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      router.push("/shipments")
    } finally {
      setIsFetching(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchCustomers()
    fetchPartialShipment()
  }, [fetchCustomers, fetchPartialShipment])

  // Convert customers to options for react-select
  const customerOptions = customers.map((customer) => ({
    value: customer.id.toString(),
    label: customer.name,
  }))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Package details handlers
  const handlePackageDetailChange = (index: number, field: string, value: string) => {
    const updatedPackages = [...packageDetails]
    updatedPackages[index] = { ...updatedPackages[index], [field]: value }
    setPackageDetails(updatedPackages)
  }

  const addPackageDetail = () => {
    const newPackages = [
      ...packageDetails,
      {
        length: "",
        width: "",
        height: "",
        weight: "",
        units: "1",
        typeOfPackage: "package",
        customType: "",
        totalCost: "",
        costType: "CPM",
        description: "",
      },
    ]
    setPackageDetails(newPackages)
  }

  const removePackageDetail = (index: number) => {
    const updatedPackages = packageDetails.filter((_, i) => i !== index)
    setPackageDetails(updatedPackages)
  }

  // Shipment items handlers
  const handleItemChange = (index: number, field: string, value: string) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    // Automatically compute overallPrice if priceByUnit or quantity changes
    if (field === "priceByUnit" || field === "quantity") {
      const price = Number.parseFloat(updatedItems[index].priceByUnit) || 0
      const qty = Number.parseFloat(updatedItems[index].quantity) || 0
      updatedItems[index].overallPrice = (price * qty).toFixed(2)
    }
    setItems(updatedItems)
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        weight: "",
        origin: "",
        hscode: "",
        overallPrice: "",
        unit: "",
        quantity: "",
        description: "",
        priceByUnit: "",
      },
    ])
  }

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Process packages
      const processedPackages = packageDetails.map((pkg) => ({
        ...pkg,
        // Use customType if typeOfPackage is 'other'
        typeOfPackage: pkg.typeOfPackage === "other" ? pkg.customType : pkg.typeOfPackage,
      }))

      // Clean package details: if every field is empty, send an empty array
      const cleanedPackageDetails = processedPackages.every(
        (pkg) => !pkg.length.trim() && !pkg.width.trim() && !pkg.height.trim() && !pkg.weight.trim(),
      )
        ? []
        : processedPackages

      // Clean shipment items: if every field is empty, send empty array
      const cleanedItems = items.every(
        (item) =>
          !item.weight.trim() &&
          !item.origin.trim() &&
          !item.hscode.trim() &&
          !item.priceByUnit.trim() &&
          !item.quantity.trim(),
      )
        ? []
        : items

      // Build FormData object
      const formDataToSend = new FormData()
      formDataToSend.append("customerId", formData.customerId)
      formDataToSend.append("receiverName", formData.receiverName)
      formDataToSend.append("receiverPhone", formData.receiverPhone)
      formDataToSend.append("receiverAddress", formData.receiverAddress)
      formDataToSend.append("cost", formData.cost)
      formDataToSend.append("amountPaid", formData.amountPaid)
      formDataToSend.append("paymentStatus", formData.paymentStatus)

      if (formData.paymentStatus !== "paid") {
        formDataToSend.append("paymentResponsibility", paymentResponsibility)
      }

      formDataToSend.append("extraCostReason", formData.extraCostReason)
      formDataToSend.append("extraCostAmount", formData.extraCostAmount)
      formDataToSend.append("noteContent", noteContent)

      // Append packages and items as JSON strings
      formDataToSend.append("packages", JSON.stringify(cleanedPackageDetails))
      formDataToSend.append("items", JSON.stringify(cleanedItems))

      // Append existing note images to keep
      formDataToSend.append("existingNoteImages", JSON.stringify(existingNoteImages))

      // Append new note images
      noteImages.forEach((file) => {
        formDataToSend.append("noteImages", file)
      })

      // Send update request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partial-shipments/${id}`, {
        method: "PUT",
        body: formDataToSend,
      })

      if (!response.ok) {
        throw new Error("Failed to update partial shipment")
      }

      toast({
        title: "Success",
        description: "Partial shipment updated successfully.",
      })

      // Navigate back to the shipment details page
      if (partialShipment?.shipmentId) {
        router.push(`/shipments/${partialShipment.shipmentId}`)
      } else {
        router.push("/shipments")
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update partial shipment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!partialShipment) {
    return <div className="text-center p-8">Partial shipment not found</div>
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white tracking-tight">Edit Partial Shipment #{id}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Customer Information */}
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#1ABC9C]">
            <CardHeader className="bg-gradient-to-r from-[#E8F8F5] to-white">
              <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center tracking-tight">
                <Package className="mr-2 h-5 w-5 text-[#1ABC9C]" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex-1">
                <Label htmlFor="customerId">Customer</Label>
                <ReactSelect
                  inputId="customerId"
                  name="customerId"
                  value={customerOptions.find((option) => option.value === formData.customerId)}
                  onChange={(selectedOption) =>
                    handleSelectChange("customerId", selectedOption ? selectedOption.value : "")
                  }
                  options={customerOptions}
                  placeholder="Select or search a customer"
                  isClearable
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </CardContent>
          </Card>

          {/* Receiver Information */}
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#3498DB]">
            <CardHeader className="bg-gradient-to-r from-[#E8F6FD] to-white">
              <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center tracking-tight">
                <Truck className="mr-2 h-5 w-5 text-[#3498DB]" />
                Receiver Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="receiverName">Receiver Name</Label>
                <Input
                  id="receiverName"
                  name="receiverName"
                  value={formData.receiverName}
                  onChange={handleInputChange}
                  required
                  className="border-gray-300 focus:border-[#3498DB] focus:ring-[#3498DB]"
                />
              </div>
              <div>
                <Label htmlFor="receiverPhone">Receiver Phone</Label>
                <Input
                  id="receiverPhone"
                  name="receiverPhone"
                  value={formData.receiverPhone}
                  onChange={handleInputChange}
                  required
                  className="border-gray-300 focus:border-[#3498DB] focus:ring-[#3498DB]"
                />
              </div>
              <div>
                <Label htmlFor="receiverAddress">Receiver Address</Label>
                <Input
                  id="receiverAddress"
                  name="receiverAddress"
                  value={formData.receiverAddress}
                  onChange={handleInputChange}
                  required
                  className="border-gray-300 focus:border-[#3498DB] focus:ring-[#3498DB]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Package Details Section */}
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#F39C12]">
            <CardHeader className="bg-gradient-to-r from-[#FDF2E9] to-white">
              <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center tracking-tight">
                <Package className="mr-2 h-5 w-5 text-[#F39C12]" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {packageDetails.map((pkg, index) => (
                <div key={index} className="border p-4 rounded-md space-y-2 bg-[#FDF2E9]">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor={`pkg-length-${index}`}>Length (m)</Label>
                      <Input
                        id={`pkg-length-${index}`}
                        value={pkg.length}
                        onChange={(e) => handlePackageDetailChange(index, "length", e.target.value)}
                        placeholder="Length"
                        type="number"
                        step="0.01"
                        className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`pkg-width-${index}`}>Width (m)</Label>
                      <Input
                        id={`pkg-width-${index}`}
                        value={pkg.width}
                        onChange={(e) => handlePackageDetailChange(index, "width", e.target.value)}
                        placeholder="Width"
                        type="number"
                        step="0.01"
                        className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor={`pkg-height-${index}`}>Height (m)</Label>
                      <Input
                        id={`pkg-height-${index}`}
                        value={pkg.height}
                        onChange={(e) => handlePackageDetailChange(index, "height", e.target.value)}
                        placeholder="Height"
                        type="number"
                        step="0.01"
                        className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`pkg-weight-${index}`}>Weight (kg)</Label>
                      <Input
                        id={`pkg-weight-${index}`}
                        value={pkg.weight}
                        onChange={(e) => handlePackageDetailChange(index, "weight", e.target.value)}
                        placeholder="Weight"
                        type="number"
                        step="0.1"
                        className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor={`pkg-units-${index}`}>Units</Label>
                      <Input
                        id={`pkg-units-${index}`}
                        value={pkg.units}
                        onChange={(e) => handlePackageDetailChange(index, "units", e.target.value)}
                        placeholder="Units"
                        type="number"
                        step="1"
                        min="1"
                        className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`pkg-description-${index}`}>Description</Label>
                      <Input
                        id={`pkg-description-${index}`}
                        value={pkg.description}
                        onChange={(e) => handlePackageDetailChange(index, "description", e.target.value)}
                        placeholder="Package description"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`pkg-costType-${index}`}>Cost Calculation Type</Label>
                      <Select
                        value={pkg.costType}
                        onValueChange={(value) => handlePackageDetailChange(index, "costType", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select cost type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPM">Cost Per Cubic Meter</SelectItem>
                          <SelectItem value="KG">Cost Per Kilogram</SelectItem>
                          <SelectItem value="Piece">Cost Per Piece</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`pkg-totalCost-${index}`}>Total Cost</Label>
                    <Input
                      id={`pkg-totalCost-${index}`}
                      value={pkg.totalCost}
                      onChange={(e) => handlePackageDetailChange(index, "totalCost", e.target.value)}
                      type="number"
                      step="0.01"
                      placeholder="Enter total cost"
                      className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`pkg-typeOfPackage-${index}`}>Type Of Package</Label>
                    <Select
                      name={`pkg-typeOfPackage-${index}`}
                      value={pkg.typeOfPackage}
                      onValueChange={(value) => handlePackageDetailChange(index, "typeOfPackage", value)}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]">
                        <SelectValue placeholder="Select package type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="package">Package</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="piece">Piece</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="pallet">Pallet</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {pkg.typeOfPackage === "other" && (
                      <Input
                        id={`pkg-customType-${index}`}
                        value={pkg.customType}
                        onChange={(e) => handlePackageDetailChange(index, "customType", e.target.value)}
                        placeholder="Enter custom package type"
                        className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                      />
                    )}
                  </div>
                  {packageDetails.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removePackageDetail(index)}
                      size="sm"
                      className="mt-2"
                    >
                      Remove Package
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addPackageDetail}
                size="sm"
                className="text-[#F39C12] border-[#F39C12] hover:bg-[#F39C12] hover:text-white"
              >
                Add Package
              </Button>
            </CardContent>
          </Card>

          {/* Shipment Items Section */}
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#9B59B6]">
            <CardHeader className="bg-gradient-to-r from-[#F4ECF7] to-white">
              <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center tracking-tight">
                <Truck className="mr-2 h-5 w-5 text-[#9B59B6]" />
                Shipment Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border p-4 rounded-md space-y-4 bg-[#F4ECF7]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`item-weight-${index}`}>Weight</Label>
                      <Input
                        id={`item-weight-${index}`}
                        value={item.weight}
                        onChange={(e) => handleItemChange(index, "weight", e.target.value)}
                        type="number"
                        step="0.1"
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-origin-${index}`}>Origin</Label>
                      <Input
                        id={`item-origin-${index}`}
                        value={item.origin}
                        onChange={(e) => handleItemChange(index, "origin", e.target.value)}
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-hscode-${index}`}>HS Code</Label>
                      <Input
                        id={`item-hscode-${index}`}
                        value={item.hscode}
                        onChange={(e) => handleItemChange(index, "hscode", e.target.value)}
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`item-priceByUnit-${index}`}>Price By Unit</Label>
                      <Input
                        id={`item-priceByUnit-${index}`}
                        value={item.priceByUnit}
                        onChange={(e) => handleItemChange(index, "priceByUnit", e.target.value)}
                        type="number"
                        step="0.01"
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                      <Input
                        id={`item-quantity-${index}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        type="number"
                        step="0.01"
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-overallPrice-${index}`}>Overall Price</Label>
                      <Input
                        id={`item-overallPrice-${index}`}
                        value={item.overallPrice}
                        readOnly
                        className="border-gray-300 bg-gray-100 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`item-unit-${index}`}>Unit</Label>
                      <Select value={item.unit} onValueChange={(value) => handleItemChange(index, "unit", value)}>
                        <SelectTrigger className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="lb">Pounds</SelectItem>
                          <SelectItem value="piece">Pieces</SelectItem>
                          <SelectItem value="box">Boxes</SelectItem>
                          <SelectItem value="carton">Cartons</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`item-description-${index}`}>Description</Label>
                      <Input
                        id={`item-description-${index}`}
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeItem(index)}
                      size="sm"
                      className="mt-2"
                    >
                      Remove Item
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                size="sm"
                className="text-[#9B59B6] border-[#9B59B6] hover:bg-[#9B59B6] hover:text-white"
              >
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Note Information Section */}
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#27AE60]">
            <CardHeader className="bg-gradient-to-r from-[#E9F7EF] to-white">
              <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center tracking-tight">
                <FileText className="mr-2 h-5 w-5 text-[#27AE60]" />
                Note Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="noteContent">Note Content</Label>
                <textarea
                  id="noteContent"
                  name="noteContent"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full p-2 border rounded border-gray-300 focus:border-[#27AE60] focus:ring-[#27AE60]"
                  rows={4}
                  placeholder="Enter note details here..."
                />
              </div>
              {existingNoteImages.length > 0 && (
                <div>
                  <Label>Existing Images</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {existingNoteImages.map((image, index) => (
                      <div key={index} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}${image.startsWith("/") ? "" : "/"}${image}`}
                          alt={`Note image ${index}`}
                          className="w-16 h-16 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full"
                          onClick={() => {
                            setExistingNoteImages(existingNoteImages.filter((_, i) => i !== index))
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="noteImages">Add New Images</Label>
                <Input
                  id="noteImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setNoteImages(Array.from(e.target.files))
                    }
                  }}
                  className="border-gray-300 focus:border-[#27AE60] focus:ring-[#27AE60]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Information Section */}
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#E74C3C]">
            <CardHeader className="bg-gradient-to-r from-[#FADBD8] to-white">
              <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center tracking-tight">
                <CreditCard className="mr-2 h-5 w-5 text-[#E74C3C]" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cost">Total Cost</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleInputChange}
                  required
                  className="border-gray-300 focus:border-[#E74C3C] focus:ring-[#E74C3C]"
                />
              </div>
              <div>
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  name="amountPaid"
                  type="number"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={handleInputChange}
                  required
                  className="border-gray-300 focus:border-[#E74C3C] focus:ring-[#E74C3C]"
                />
              </div>

              {/* Extra Cost Fields */}
              <div>
                <Label htmlFor="extraCostReason">Extra Cost Reason</Label>
                <Input
                  id="extraCostReason"
                  name="extraCostReason"
                  type="text"
                  value={formData.extraCostReason}
                  onChange={handleInputChange}
                  placeholder="Describe any additional cost"
                  className="border-gray-300 focus:border-[#E74C3C] focus:ring-[#E74C3C]"
                />
              </div>
              <div>
                <Label htmlFor="extraCostAmount">Extra Cost Amount</Label>
                <Input
                  id="extraCostAmount"
                  name="extraCostAmount"
                  type="number"
                  step="0.01"
                  value={formData.extraCostAmount}
                  onChange={handleInputChange}
                  placeholder="e.g. 25.00"
                  className="border-gray-300 focus:border-[#E74C3C] focus:ring-[#E74C3C]"
                />
              </div>

              {/* Payment Status */}
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onValueChange={(value) => handleSelectChange("paymentStatus", value)}
                >
                  <SelectTrigger className="border-gray-300 focus:border-[#E74C3C] focus:ring-[#E74C3C]">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.paymentStatus !== "paid" && (
                <div>
                  <Label htmlFor="paymentResponsibility">Outstanding Payment Responsibility</Label>
                  <Select
                    name="paymentResponsibility"
                    value={paymentResponsibility}
                    onValueChange={(value) => setPaymentResponsibility(value)}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-[#E74C3C] focus:ring-[#E74C3C]">
                      <SelectValue placeholder="Select responsibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="receiver">Receiver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-1/3">
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-2/3 bg-gradient-to-r from-[#1ABC9C] to-[#27AE60] hover:from-[#16A085] hover:to-[#2ECC71] text-white transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Partial Shipment...
                </>
              ) : (
                "Update Partial Shipment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
