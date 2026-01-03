"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Loader2, Package, Truck, FileText, CreditCard } from "lucide-react"
import * as XLSX from "xlsx"
import ProtectedRoute from "@/components/ProtectedRoute"
import ReactSelect, { type FilterOptionOption } from "react-select"

// Updated Customer interface
interface Customer {
  id: number
  name: string
  phone: string | null
  address: string
}

interface PackageDetail {
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

export default function AddPartialShipmentPage() {
  const router = useRouter()
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  // New customer info including the "origin" field
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
    origin: "",
  })

  // General form data
  const [formData, setFormData] = useState({
    customerId: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    cost: "",
    amountPaid: "",
    paymentStatus: "unpaid", // default option
    extraCostReason: "",
    extraCostAmount: "",
  })

  // Payment responsibility (when paymentStatus !== "paid")
  const [paymentResponsibility, setPaymentResponsibility] = useState("customer")

  // ------------------ PACKAGE DETAILS ------------------
  const [packageDetails, setPackageDetails] = useState<PackageDetail[]>([
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
  const [numberOfPackages, setNumberOfPackages] = useState<number>(1)
  const [packageEntryMode, setPackageEntryMode] = useState<"manual" | "excel">("manual")
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [columnMapping, setColumnMapping] = useState({
    length: "length",
    width: "width",
    height: "height",
    weight: "weight",
    typeOfPackage: "typeOfPackage", // mapping for new field
    customType: "customType", // mapping for custom package type if provided
    description: "description",
    costType: "costType",
    totalCost: "totalCost",
  })

  useEffect(() => {
    const total = packageDetails.reduce((acc, pkg) => {
      return acc + (parseFloat(pkg.totalCost)) || 0
    }, 0)
    setFormData(prev => ({ ...prev, cost: total.toFixed(2) }))
  }, [packageDetails])

  // ------------------ SHIPMENT ITEMS ------------------
  const [items, setItems] = useState([
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
  const [itemsEntryMode, setItemsEntryMode] = useState<"manual" | "excel">("manual")
  const [itemsExcelFile, setItemsExcelFile] = useState<File | null>(null)
  const [itemsColumnMapping, setItemsColumnMapping] = useState({
    weight: "weight",
    origin: "origin",
    hscode: "hscode",
    // "amount" removed
    // overallPrice will be calculated automatically
    unit: "unit",
    quantity: "quantity",
    description: "description",
    priceByUnit: "priceByUnit",
  })

  // ------------------ NOTE INFORMATION ------------------
  const [noteContent, setNoteContent] = useState("")
  const [noteImages, setNoteImages] = useState<File[]>([])

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
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
  }

  type CustomerOption = {
    value: string
    label: string
    phone?: string | null
  }

  const normalizeSearch = (value: string | null | undefined) =>
    (value || "").toLowerCase().replace(/\s+/g, "")

  const filterCustomerOption = (
    option: FilterOptionOption<CustomerOption>,
    inputValue: string,
  ) => {
    const term = normalizeSearch(inputValue)
    if (!term) return true
    return (
      normalizeSearch(option.data.label).includes(term) ||
      normalizeSearch(option.data.phone).includes(term)
    )
  }

  // Convert customers to options for react-select
  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    value: customer.id.toString(),
    label: customer.name,
    phone: customer.phone,
  }))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // ------------------ SHIPMENT ITEMS HANDLERS ------------------
  const handleItemChange = (index: number, field: string, value: string) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    // Automatically compute overallPrice if priceByUnit or quantity changes
    if (field === "priceByUnit" || field === "quantity") {
      const price = parseFloat(updatedItems[index].priceByUnit) || 0
      const qty = parseFloat(updatedItems[index].quantity) || 0
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

  // ------------------ PACKAGE DETAILS HANDLERS ------------------
  const handlePackageDetailChange = (index: number, field: string, value: string) => {
    const updatedPackages = [...packageDetails]
    updatedPackages[index] = { ...updatedPackages[index], [field]: value }
    setPackageDetails(updatedPackages)
  }

  const addPackageDetail = () => {
    const newPackages = [
      ...packageDetails,
      { length: "", width: "", height: "", weight: "", units: "1", typeOfPackage: "package", customType: "", totalCost: "", costType: "CPM", description: "" },
    ]
    setPackageDetails(newPackages)
    setNumberOfPackages(newPackages.length)
  }

  const removePackageDetail = (index: number) => {
    const updatedPackages = packageDetails.filter((_, i) => i !== index)
    setPackageDetails(updatedPackages)
    setNumberOfPackages(updatedPackages.length)
  }

  const handleNumberOfPackagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCount = Number(e.target.value)
    setNumberOfPackages(newCount)
    if (newCount > packageDetails.length) {
      const additional = Array(newCount - packageDetails.length).fill({
        length: "",
        width: "",
        height: "",
        weight: "",
        units: "1",
        typeOfPackage: "package",
        customType: "",
      })
      setPackageDetails([...packageDetails, ...additional])
    } else if (newCount < packageDetails.length) {
      setPackageDetails(packageDetails.slice(0, newCount))
    }
  }

  // ------------------ EXCEL IMPORT HANDLERS ------------------
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0])
    }
  }

  const handleProcessExcel = async () => {
    if (!excelFile) return
    try {
      const data = await excelFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      const importedPackages = jsonData.map((row: any) => ({
        length: row[columnMapping.length] ? String(row[columnMapping.length]) : "",
        width: row[columnMapping.width] ? String(row[columnMapping.width]) : "",
        height: row[columnMapping.height] ? String(row[columnMapping.height]) : "",
        weight: row[columnMapping.weight] ? String(row[columnMapping.weight]) : "",
        units: row["units"] ? String(row["units"]) : "1",
        typeOfPackage: row[columnMapping.typeOfPackage] === "other" 
        ? row[columnMapping.customType] 
        : row[columnMapping.typeOfPackage] || "package",
        customType: row[columnMapping.customType] ? String(row[columnMapping.customType]) : "",
        description: row[columnMapping.description]?.toString() || "",
        costType: row[columnMapping.costType]?.toString() || "CPM",
        totalCost: row[columnMapping.totalCost]?.toString() || "",
      }))
      setPackageDetails(importedPackages)
      setNumberOfPackages(importedPackages.length)
      toast({
        title: "Success",
        description: "Excel file processed successfully.",
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process Excel file."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // For Shipment Items (Excel)
  const handleItemsExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setItemsExcelFile(e.target.files[0])
    }
  }

  const handleProcessItemsExcel = async () => {
    if (!itemsExcelFile) return
    try {
      const data = await itemsExcelFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      const importedItems = jsonData.map((row: any) => {
        const price = parseFloat(row[itemsColumnMapping.priceByUnit]) || 0
        const qty = parseFloat(row[itemsColumnMapping.quantity]) || 0
        return {
          weight: row[itemsColumnMapping.weight] ? String(row[itemsColumnMapping.weight]) : "",
          unit: row[itemsColumnMapping.unit] ? String(row[itemsColumnMapping.unit]) : "",
          origin: row[itemsColumnMapping.origin] ? String(row[itemsColumnMapping.origin]) : "",
          hscode: row[itemsColumnMapping.hscode] ? String(row[itemsColumnMapping.hscode]) : "",
          overallPrice: (price * qty).toFixed(2),
          quantity: row[itemsColumnMapping.quantity] ? String(row[itemsColumnMapping.quantity]) : "",
          description: row[itemsColumnMapping.description] ? String(row[itemsColumnMapping.description]) : "",
          priceByUnit: row[itemsColumnMapping.priceByUnit] ? String(row[itemsColumnMapping.priceByUnit]) : "",
        }
      })
      setItems(importedItems)
      toast({
        title: "Success",
        description: "Shipment Items Excel file processed successfully.",
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process Shipment Items Excel file."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // ------------------ FORM SUBMISSION ------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log('hi',formData )
    setIsLoading(true);
  
    try {
      let customerId = formData.customerId;
      // Create new customer if provided
      if (newCustomerData.name.trim()) {
        // ** existence check by phone **
        const existing = customers.find(c => c.phone === newCustomerData.phone);
        if (existing) {
          customerId = existing.id.toString();
        } else {
          // create brand‑new customer
          const newCustomerFormData = new FormData();
          newCustomerFormData.append("name", newCustomerData.name);
          newCustomerFormData.append("phone", newCustomerData.phone);
          newCustomerFormData.append("address", newCustomerData.address);
          newCustomerFormData.append("origin", newCustomerData.origin);
  
          const customerResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/customers`,
            { method: "POST", body: newCustomerFormData }
          );
          if (!customerResponse.ok) throw new Error("Failed to create new customer");
          const newCustomerResult = await customerResponse.json();
          customerId = newCustomerResult.id.toString();
        }
      }

      const processedPackages = packageDetails.map(pkg => ({
        ...pkg,
        // Use customType if typeOfPackage is 'other'
        typeOfPackage: pkg.typeOfPackage === "other" ? pkg.customType : pkg.typeOfPackage
      }));
  
      // Clean package details: if every field is empty, send an empty array.
      const cleanedPackageDetails =
        processedPackages.every(
          (pkg) =>
            !pkg.length.trim() &&
            !pkg.width.trim() &&
            !pkg.height.trim() &&
            !pkg.weight.trim()
        )
          ? []
          : processedPackages;
  
      // Clean shipment items: if every field is empty (or you can pick key fields to check), send empty array.
      const cleanedItems =
        items.every(
          (item) =>
            !item.weight.trim() &&
            !item.origin.trim() &&
            !item.hscode.trim() &&
            !item.priceByUnit.trim() &&
            !item.quantity.trim()
        )
          ? []
          : items;
  
      // Build a FormData object to send as multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("customerId", customerId);
      formDataToSend.append("receiverName", formData.receiverName);
      formDataToSend.append("receiverPhone", formData.receiverPhone);
      formDataToSend.append("receiverAddress", formData.receiverAddress);
      formDataToSend.append("cost", formData.cost);
      formDataToSend.append("amountPaid", formData.amountPaid);
      formDataToSend.append("paymentStatus", formData.paymentStatus);
      if (formData.paymentStatus !== "paid") {
        formDataToSend.append("paymentResponsibility", paymentResponsibility);
      }
      formDataToSend.append("extraCostReason", formData.extraCostReason)
      formDataToSend.append("extraCostAmount", formData.extraCostAmount)
      formDataToSend.append("noteContent", noteContent);
      // Append packages and items as JSON strings (will be "[]" if none provided)
      formDataToSend.append("packages", JSON.stringify(cleanedPackageDetails));
      formDataToSend.append("items", JSON.stringify(cleanedItems));
  
      // Append note images
      noteImages.forEach((file) => {
        formDataToSend.append("noteImages", file);
      });
  
      // Send payload to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${id}/partial-shipments`,
        {
          method: "POST",
          body: formDataToSend,
        }
      );
  
      if (!response.ok) {
        throw new Error("Failed to create partial shipment");
      }
  
      toast({
        title: "Success",
        description: "Partial shipment added successfully.",
      });
      router.push(`/shipments/${id}`);
    } catch {
      toast({
        title: `Error`,
        description: "Failed to add partial shipment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-white tracking-tight">Add Partial Shipment</h1>

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
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="customerId">Select Existing Customer</Label>
                  <ReactSelect
                    inputId="customerId"
                    name="customerId"
                    value={customerOptions.find((option) => option.value === formData.customerId)}
                    onChange={(selectedOption) =>
                      handleSelectChange("customerId", selectedOption ? selectedOption.value : "")
                    }
                    options={customerOptions}
                    filterOption={filterCustomerOption}
                    placeholder="Select or search a customer"
                    isClearable
                    isSearchable
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Or Add New Customer</Label>
                  <Input
                    id="newCustomerName"
                    value={newCustomerData.name}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Customer Name"
                    className="border-gray-300 focus:border-[#1ABC9C] focus:ring-[#1ABC9C]"
                  />
                  <Input
                    id="newCustomerPhone"
                    value={newCustomerData.phone}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="Customer Phone"
                    className="border-gray-300 focus:border-[#1ABC9C] focus:ring-[#1ABC9C]"
                  />
                  <Input
                    id="newCustomerAddress"
                    value={newCustomerData.address}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        address: e.target.value,
                      })
                    }
                    placeholder="Customer Address"
                    className="border-gray-300 focus:border-[#1ABC9C] focus:ring-[#1ABC9C]"
                  />
                  <Input
                    id="newCustomerOrigin"
                    value={newCustomerData.origin}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        origin: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Customer Origin"
                    className="border-gray-300 focus:border-[#1ABC9C] focus:ring-[#1ABC9C]"
                  />
                </div>
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
              {/* Mode Selection */}
              <div className="mb-4">
                <Label>Package Entry Mode</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={packageEntryMode === "manual" ? "default" : "outline"}
                    onClick={() => setPackageEntryMode("manual")}
                    className={
                      packageEntryMode === "manual" ? "bg-[#F39C12] text-white" : "text-[#F39C12] border-[#F39C12]"
                    }
                  >
                    Manual Entry
                  </Button>
                  <Button
                    type="button"
                    variant={packageEntryMode === "excel" ? "default" : "outline"}
                    onClick={() => setPackageEntryMode("excel")}
                    className={
                      packageEntryMode === "excel" ? "bg-[#F39C12] text-white" : "text-[#F39C12] border-[#F39C12]"
                    }
                  >
                    Import from Excel
                  </Button>
                </div>
              </div>
              {packageEntryMode === "manual" && (
                <>
                  <div>
                    <Label htmlFor="numberOfPackages">Number of Packages</Label>
                    <Input
                      id="numberOfPackages"
                      type="number"
                      value={numberOfPackages}
                      onChange={handleNumberOfPackagesChange}
                      min="1"
                      className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                    />
                  </div>
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
                      {/* Units Field */}
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
                      {/* New Type Of Package Field */}
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
                </>
              )}
              {packageEntryMode === "excel" && (
                <>
                  <div>
                    <Label htmlFor="excelFile">Upload Excel File</Label>
                    <Input
                      id="excelFile"
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelFileChange}
                      className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Column Mapping (if different from defaults)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="map-length">Length Column</Label>
                        <Input
                          id="map-length"
                          value={columnMapping.length}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              length: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="map-width">Width Column</Label>
                        <Input
                          id="map-width"
                          value={columnMapping.width}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              width: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="map-height">Height Column</Label>
                        <Input
                          id="map-height"
                          value={columnMapping.height}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              height: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="map-weight">Weight Column</Label>
                        <Input
                          id="map-weight"
                          value={columnMapping.weight}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              weight: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="map-typeOfPackage">Type Of Package Column</Label>
                        <Input
                          id="map-typeOfPackage"
                          value={columnMapping.typeOfPackage}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              typeOfPackage: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="map-customType">Custom Type Column</Label>
                        <Input
                          id="map-customType"
                          value={columnMapping.customType}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              customType: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#F39C12] focus:ring-[#F39C12]"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                        <Label htmlFor="map-description">Description Column</Label>
                        <Input
                          id="map-description"
                          value={columnMapping.description}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-costType">Cost Type Column</Label>
                        <Input
                          id="map-costType"
                          value={columnMapping.costType}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, costType: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-totalCost">Total Cost Column</Label>
                        <Input
                          id="map-totalCost"
                          value={columnMapping.totalCost}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, totalCost: e.target.value }))}
                        />
                      </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleProcessExcel}
                    size="sm"
                    className="text-[#F39C12] border-[#F39C12] hover:bg-[#F39C12] hover:text-white"
                  >
                    Process Excel File
                  </Button>
                  {packageDetails.length > 0 && (
                    <div className="mt-4">
                      <Label>Imported Package Details</Label>
                      <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Length
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Width
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Height
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Weight
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Units
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type Of Package
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Cost
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost Type
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {packageDetails.map((pkg, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2">{index + 1}</td>
                                <td className="px-4 py-2">{pkg.length}</td>
                                <td className="px-4 py-2">{pkg.width}</td>
                                <td className="px-4 py-2">{pkg.height}</td>
                                <td className="px-4 py-2">{pkg.weight}</td>
                                <td className="px-4 py-2">{pkg.units}</td>
                                <td className="px-4 py-2">
                                  {pkg.typeOfPackage === "other" ? pkg.customType : pkg.typeOfPackage}
                                </td>
                                <td className="px-4 py-2">{pkg.totalCost}</td>
                                <td className="px-4 py-2">{pkg.costType}</td>
                                <td className="px-4 py-2">{pkg.description}</td>

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              {/* Items Mode Selection */}
              <div className="mb-4">
                <Label>Items Entry Mode</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={itemsEntryMode === "manual" ? "default" : "outline"}
                    onClick={() => setItemsEntryMode("manual")}
                    className={
                      itemsEntryMode === "manual" ? "bg-[#9B59B6] text-white" : "text-[#9B59B6] border-[#9B59B6]"
                    }
                  >
                    Manual Entry
                  </Button>
                  <Button
                    type="button"
                    variant={itemsEntryMode === "excel" ? "default" : "outline"}
                    onClick={() => setItemsEntryMode("excel")}
                    className={
                      itemsEntryMode === "excel" ? "bg-[#9B59B6] text-white" : "text-[#9B59B6] border-[#9B59B6]"
                    }
                  >
                    Import from Excel
                  </Button>
                </div>
              </div>
              {itemsEntryMode === "manual" && (
                <>
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
                        <Select
                          value={item.unit}
                          onValueChange={(value) => handleItemChange(index, "unit", value)}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="package">Package</SelectItem>
                              <SelectItem value="kg">Kilograms</SelectItem>
                              <SelectItem value="lb">Pounds</SelectItem>
                              <SelectItem value="piece">Pieces</SelectItem>
                              <SelectItem value="box">Boxes</SelectItem>
                              <SelectItem value="carton">Cartons</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* ... rest of the inputs ... */}
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
                </>
              )}
              {itemsEntryMode === "excel" && (
                <>
                  <div>
                    <Label htmlFor="itemsExcelFile">Upload Excel File</Label>
                    <Input
                      id="itemsExcelFile"
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleItemsExcelFileChange}
                      className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Column Mapping (if different from defaults)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="map-item-unit">Unit Column</Label>
                      <Input
                        id="map-item-unit"
                        value={itemsColumnMapping.unit}
                        onChange={(e) =>
                          setItemsColumnMapping((prev) => ({
                            ...prev,
                            unit: e.target.value,
                          }))
                        }
                        className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                      />
                    </div>
                      <div>
                        <Label htmlFor="map-item-weight">Weight Column</Label>
                        <Input
                          id="map-item-weight"
                          value={itemsColumnMapping.weight}
                          onChange={(e) =>
                            setItemsColumnMapping((prev) => ({
                              ...prev,
                              weight: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-item-origin">Origin Column</Label>
                        <Input
                          id="map-item-origin"
                          value={itemsColumnMapping.origin}
                          onChange={(e) =>
                            setItemsColumnMapping((prev) => ({
                              ...prev,
                              origin: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-item-hscode">HS Code Column</Label>
                        <Input
                          id="map-item-hscode"
                          value={itemsColumnMapping.hscode}
                          onChange={(e) =>
                            setItemsColumnMapping((prev) => ({
                              ...prev,
                              hscode: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-item-quantity">Quantity Column</Label>
                        <Input
                          id="map-item-quantity"
                          value={itemsColumnMapping.quantity}
                          onChange={(e) =>
                            setItemsColumnMapping((prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-item-description">Description Column</Label>
                        <Input
                          id="map-item-description"
                          value={itemsColumnMapping.description}
                          onChange={(e) =>
                            setItemsColumnMapping((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="map-item-priceByUnit">Price By Unit Column</Label>
                        <Input
                          id="map-item-priceByUnit"
                          value={itemsColumnMapping.priceByUnit}
                          onChange={(e) =>
                            setItemsColumnMapping((prev) => ({
                              ...prev,
                              priceByUnit: e.target.value,
                            }))
                          }
                          className="border-gray-300 focus:border-[#9B59B6] focus:ring-[#9B59B6]"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleProcessItemsExcel}
                    size="sm"
                    className="text-[#9B59B6] border-[#9B59B6] hover:bg-[#9B59B6] hover:text-white"
                  >
                    Process Excel File
                  </Button>
                  {items.length > 0 && (
                    <div className="mt-4">
                      <Label>Imported Shipment Items</Label>
                      <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Weight
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Origin
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                HS Code
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Overall Price
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-2 py-1">{index + 1}</td>
                                <td className="px-2 py-1">{item.weight}</td>
                                <td className="px-2 py-1">{item.unit}</td>
                                <td className="px-2 py-1">{item.origin}</td>
                                <td className="px-2 py-1">{item.hscode}</td>
                                <td className="px-2 py-1">{item.unit}</td>
                                <td className="px-2 py-1">{item.quantity}</td>
                                <td className="px-2 py-1">{item.overallPrice}</td>
                                <td className="px-2 py-1">{item.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              <div>
                <Label htmlFor="noteImages">Note Images</Label>
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

              {/* NEW: Extra Cost Fields */}
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
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#1ABC9C] to-[#27AE60] hover:from-[#16A085] hover:to-[#2ECC71] text-white transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Partial Shipment...
              </>
            ) : (
              "Add Partial Shipment"
            )}
          </Button>
        </form>
      </div>
    </ProtectedRoute>
  )
}
