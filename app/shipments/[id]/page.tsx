"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Package, Plus, Search, Truck } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import ProtectedRoute from "@/components/ProtectedRoute"
import ShipmentTable from "../components/shipment-table"
import type { Shipment, PartialShipment, Customer } from "../types/shipping"
import EditPartialShipmentDialog from "../components/EditPartialShipmentDialog"

type OpenShipmentOption = {
  id: number
  destination: string
}



export default function PartialShipmentsPage() {
  const router = useRouter()
  const { id } = useParams()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredPartialShipments, setFilteredPartialShipments] = useState<PartialShipment[]>([])
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null)
  const [generatingReceiptId, setGeneratingReceiptId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  /* ─────────────────  NEW: close-batch dialog state  ─────────────── */
  const [closeOpen, setCloseOpen] = useState(false)
  const [driverName, setDriverName] = useState("")
  const [driverVehicle, setDriverVehicle] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)

  // States for editing discount amount
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [selectedPartial, setSelectedPartial] = useState<PartialShipment | null>(null)
  const [newDiscount, setNewDiscount] = useState("")
  // Add a loading state for the discount update
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(false)

  // dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [toEdit, setToEdit] = useState<PartialShipment | null>(null)
  // States for adding extra cost
  const [extraCostDialogOpen, setExtraCostDialogOpen] = useState(false)
  const [extraCostReasonInput, setExtraCostReasonInput] = useState("")
  const [extraCostAmountInput, setExtraCostAmountInput] = useState("")
  const [selectedExtraCostPartial, setSelectedExtraCostPartial] = useState<PartialShipment | null>(null)
  const [isLoadingExtraCost, setIsLoadingExtraCost] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [openShipments, setOpenShipments] = useState<OpenShipmentOption[]>([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState("")
  const [selectedTransferPartial, setSelectedTransferPartial] = useState<PartialShipment | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)

  
  // Calculate total cost for the batch (including discounts and extra costs)
  const calculateTotalBatchCost = () => {
    if (!shipment || !shipment.partialShipments) return { baseCost: 0, extraCost: 0, discount: 0, total: 0 }

    return shipment.partialShipments.reduce(
      (acc, partial) => {
        const baseCost = partial.cost || 0
        const extraCost = partial.extraCostAmount || 0
        const discount = partial.discountAmount || 0

        return {
          baseCost: acc.baseCost + baseCost,
          extraCost: acc.extraCost + extraCost,
          discount: acc.discount + discount,
          total: acc.total + baseCost + extraCost - discount,
        }
      },
      { baseCost: 0, extraCost: 0, discount: 0, total: 0 },
    )
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "https://147.93.58.160:10000/updown/fetch.cgi/var/www/shipping"

  // alongside fetchShipmentDetails(), define:
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`)
      if (!res.ok) throw new Error("Failed to fetch customers")
      setCustomers(await res.json())
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }, [])

  const fetchOpenShipments = useCallback(async () => {
    try {
      setIsLoadingBatches(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments?status=open`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
      if (!response.ok) throw new Error("Failed to fetch open batches")
      setOpenShipments(await response.json())
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsLoadingBatches(false)
    }
  }, [])

  useEffect(() => {
    if (shipment) {
      let filtered = shipment.partialShipments

      // Apply the incomplete filter if enabled
      if (showIncompleteOnly) {
        filtered = filtered.filter((partial) => !partial.items || partial.items.length === 0)
      }

      // Apply the search term filter
      if (searchTerm.trim()) {
        const lowerSearchTerm = searchTerm.toLowerCase().trim()
        filtered = filtered.filter((partial) => {
          // Search by partial shipment ID
          if (partial.id.toString().includes(lowerSearchTerm)) {
            return true
          }
          // Search by receiver name
          if (partial.receiverName && partial.receiverName.toLowerCase().includes(lowerSearchTerm)) {
            return true
          }
          // Search by receiver phone
          if (partial.receiverPhone && partial.receiverPhone.toLowerCase().includes(lowerSearchTerm)) {
            return true
          }
          // Search by customer name
          if (partial.customer && partial.customer.name.toLowerCase().includes(lowerSearchTerm)) {
            return true
          }
          // Search by customer phone
          if (
            partial.customer &&
            partial.customer.phone &&
            partial.customer.phone.toLowerCase().includes(lowerSearchTerm)
          ) {
            return true
          }
          return false
        })
      }

      // Apply tab filtering
      if (activeTab === "paid") {
        filtered = filtered.filter((p) => p.paymentStatus === "paid" || p.paymentCompleted)
      } else if (activeTab === "unpaid") {
        filtered = filtered.filter((p) => p.paymentStatus !== "paid" && !p.paymentCompleted)
      } else if (activeTab === "incomplete") {
        filtered = filtered.filter((p) => !p.items || p.items.length === 0)
      }

      setFilteredPartialShipments(filtered)
    }
  }, [searchTerm, shipment, showIncompleteOnly, activeTab])

  const fetchShipmentDetails = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) {
        setIsLoading(true)
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${id}?includePackagesAndItems=true`,
      )
      if (!response.ok) throw new Error("Failed to fetch shipment details")
      const data = await response.json()
      // Provide a default empty array for partialShipments if it's undefined
      setShipment({ ...data, partialShipments: data.partialShipments || [] })
    } catch {
      toast({
        title: `Error`,
        description: "Failed to load shipment details. Please try again.",
        variant: "destructive",
      })
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [id])

  useEffect(() => {
    fetchShipmentDetails()
    fetchCustomers()
    fetchOpenShipments()
  }, [fetchShipmentDetails, fetchCustomers, fetchOpenShipments])

  const handleMarkPaymentDone = async (partialId: number) => {
    if (!shipment) return

    try {
      setProcessingPaymentId(partialId)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment.id}/partial-shipments/${partialId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentCompleted: true,
            paymentStatus: "paid",
          }),
        },
      )

      if (!response.ok) throw new Error("Failed to mark payment as done")

      toast({
        title: "Success",
        description: "Payment marked as completed.",
      })

      // Refresh data
      fetchShipmentDetails()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark payment as done"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const handleDeletePartialShipment = async (partialId: number) => {
    if (!shipment) return

    if (!confirm("Are you sure you want to delete this partial shipment? This action cannot be undone.")) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment.id}/partial-shipments/${partialId}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) throw new Error("Failed to delete partial shipment")

      toast({
        title: "Success",
        description: "Partial shipment deleted successfully.",
      })

      // Refresh shipment details after deletion
      fetchShipmentDetails()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error deleting partial shipment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }
  interface Item {
    weight: number
    origin: string
    hscode: string
    amount: number
    value: number
    priceByUnit?: number
    description?: string
    quantity?: number
    unit?: string
  }
  

  type DownloadableItem = Item & { partialShipmentId: number | string };

const handleDownloadItemsExcel = () => {
  if (!shipment) {
    toast({ title: "Error", description: "Shipment data not loaded.", variant: "destructive" });
    return;
  }

  // 1. Gather all items
  const allItems: DownloadableItem[] = [];
  shipment.partialShipments.forEach((partial) => {
    partial.items?.forEach(item => {
      allItems.push({
        partialShipmentId: partial.id,
        ...item,
        unit: item.unit ?? "",
      });
    });
  });

  if (allItems.length === 0) {
    toast({ title: "Error", description: "No item data available.", variant: "destructive" });
    return;
  }

  // 2. Group by `${hscode}|||${origin.toUpperCase()}`
  interface Grouped {
    partialShipmentId: number | string;
    hscode: string;
    origin: string;
    weight: number;
    quantity: number;
    value: number;
    priceByUnit: number;
    description: string;
    unit: string;
  }
  const grouped: Record<string, Grouped> = {};

  allItems.forEach(item => {
    const key = `${item.hscode}|||${item.origin.toUpperCase()}`;
    const origin = item.origin.toUpperCase();

    if (!grouped[key]) {
      grouped[key] = {
        partialShipmentId: item.partialShipmentId,
        hscode: item.hscode,
        origin,
        weight: item.weight,
        quantity: Number(item.quantity) || 0,
        value: item.value,
        priceByUnit: Number(item.priceByUnit) || 0,
        description: item.description || "",
        unit: item.unit || "other",
      };
    } else {
      const grp = grouped[key];
      grp.weight    += item.weight;
      grp.quantity  += Number(item.quantity) || 0;
      grp.value     += item.value;
      // priceByUnit, description, unit stay from first entry
    }
  });

  // 3. Build CSV
  const headers = [
    "PartialShipmentID", "HS Code", "Origin", "Weight",
    "Quantity", "Value", "Description", "PriceByUnit", "Unit"
  ];
  const rows = Object.values(grouped).map(g => [
    g.partialShipmentId.toString(),
    `"${g.hscode}"`,
    `"${g.origin}"`,
    g.weight.toString(),
    g.quantity.toString(),
    g.value.toString(),
    g.description ? `"${g.description}"` : "",
    g.priceByUnit ? g.priceByUnit.toString() : "",
    g.unit ? `"${g.unit}"` : "",
  ]);

  const BOM = "\uFEFF";
  const csv = BOM + [headers, ...rows].map(r => r.join(",")).join("\n");

  // 4. Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `shipment_items_${shipment.id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const handleDownloadHandoverInfo = () => {
  if (!shipment) {
    toast({ title: "Error", description: "Shipment data not loaded.", variant: "destructive" });
    return;
  }

  const rate = 3.67; // AED → USD
  const headers = [
    "PartialShipmentID", "Receiver Name", "Receiver Phone", "Receiver Address",
    "Sender Name", "Sender Phone", "Payment Status", "Payment Responsibility",
    "Number of Packages", "Total Package Weight", "Total Volume",
    "Discount (USD)", "Amount Paid (USD)", "Cost (USD)",
    "Extra Cost Reason", "Extra Cost (USD)",    // new columns
    "Package Description", "Cost Type",
    "Balance (USD)",                            // recalculated
    "Date of Release", "Note Content"
  ];

  const rows = shipment.partialShipments.map(partial => {
    const numPkgs = partial.packages?.reduce((sum, p) => sum + (p.units ?? 1), 0) ?? 0;
    const totalW  = partial.packages?.reduce((sum, p) => sum + ((p.weight ?? 0) * (p.units ?? 1)), 0) ?? 0;

    const discountAED   = partial.discountAmount ?? 0;
    const extraAED      = partial.extraCostAmount ?? 0;          // extra amount in AED
    const paidAED       = partial.amountPaid;
    const costAED       = partial.cost;
    const balanceAED    = costAED + extraAED - paidAED - discountAED; // include extra & discount

    const discountUSD   = discountAED / rate;
    const extraUSD      = extraAED / rate;                       // convert extra to USD
    const paidUSD       = paidAED / rate;
    const costUSD       = costAED / rate;
    const balanceUSD    = balanceAED / rate;                     // final balance in USD

    const pkgDesc   = partial.packages?.map(p => p.description).filter(Boolean).join(" | ") || "N/A";
    const costTypes = partial.packages?.map(p => p.costType).filter(Boolean).join(" | ") || "N/A";
    const todayDate = new Date().toISOString().split("T")[0];

    return [
      partial.id.toString(),
      partial.receiverName  || "N/A",
      partial.receiverPhone?.toString() || "N/A",
      partial.receiverAddress || "N/A",
      partial.customer?.name     || "N/A",
      partial.customer?.phone?.toString() || "N/A",
      partial.paymentStatus === "paid" ? "Paid" : (partial.paymentStatus || "Unpaid"),
      partial.paymentResponsibility || "N/A",
      numPkgs.toString(),
      totalW.toString(),
      partial.volume.toFixed(3),
      discountUSD.toFixed(3),
      paidUSD.toFixed(3),
      costUSD.toFixed(3),
      partial.extraCostReason || "N/A",          // new: reason
      extraUSD.toFixed(3),                       // new: extra cost USD
      `"${pkgDesc}"`,
      `"${costTypes}"`,
      balanceUSD.toFixed(3),                     // updated balance
      todayDate,
      partial.note?.content || "N/A",
    ];
  });

  const BOM = "\uFEFF";
  const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `handover_info_shipment_${shipment.id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};


  const generateReceipt = async (partial: PartialShipment) => {
    if (!shipment) return

    try {
      setGeneratingReceiptId(partial.id)

      // 1. Create PDF document
      const doc = new jsPDF()

      // — Title & header —
      doc.setFontSize(20)
      doc.setTextColor(40, 62, 80)
      doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" })

      // — Company & receipt info —
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text("Zaxon Inc.", 20, 40)
      doc.setFontSize(10)
      doc.text("Dubai, UAE", 20, 50)
      doc.text("Tel: +971 52 935 4360", 20, 55)

      doc.setFontSize(10)
      doc.text(`Receipt #: R-${partial.id}-${Date.now().toString().slice(-6)}`, 140, 40)
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 45)
      doc.text(`Shipment ID: ${shipment.id}`, 140, 50)
      doc.text(`Partial Shipment ID: ${partial.id}`, 140, 55)

      // — Divider —
      doc.setDrawColor(220, 220, 220)
      doc.line(20, 65, 190, 65)

      // — Customer & receiver info —
      doc.setFontSize(12)
      doc.text("Customer Information:", 20, 75)
      doc.setFontSize(10)
      doc.text(`Name: ${partial.customer?.name || "N/A"}`, 20, 85)
      doc.text(`Phone: ${partial.customer?.phone || "N/A"}`, 20, 90)
      doc.text(`Address: ${partial.customer?.address || "N/A"}`, 20, 95)

      doc.setFontSize(12)
      doc.text("Receiver Information:", 120, 75)
      doc.setFontSize(10)
      doc.text(`Name: ${partial.receiverName || "N/A"}`, 120, 85)
      doc.text(`Phone: ${partial.receiverPhone || "N/A"}`, 120, 90)
      doc.text(`Address: ${partial.receiverAddress || "N/A"}`, 120, 95)

      // — Divider —
      doc.line(20, 105, 190, 105)

      // — Payment details heading —
      doc.setFontSize(12)
      doc.text("Payment Details:", 20, 115)

      // 2. Build table data
      const tableData: [string, string][] = [
        ["Description", "Amount (AED)"],
        ["Shipping Cost", partial.cost.toFixed(2)],
      ]

      if (partial.discountAmount && partial.discountAmount > 0) {
        tableData.push(["Discount", `(${partial.discountAmount.toFixed(2)})`])
      }
      if (partial.extraCostAmount && partial.extraCostAmount > 0) {
        tableData.push([
          `Extra Cost${partial.extraCostReason ? ` (${partial.extraCostReason})` : ""}`,
          partial.extraCostAmount.toFixed(2),
        ])
      }

      const totalAmount = partial.cost + (partial.extraCostAmount || 0) - (partial.discountAmount || 0)
      tableData.push(["Total", totalAmount.toFixed(2)])
      tableData.push(["Amount Paid", partial.amountPaid.toFixed(2)])
      // 3. Draw the table
      ;(doc as any).autoTable({
        startY: 125,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: "grid",
        headStyles: { fillColor: [26, 188, 156], textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: "right" } },
      })

      // 4. “PAID IN FULL” and signature/footer
      const finalY = (doc as any).lastAutoTable.finalY
      doc.setFontSize(12)
      doc.setTextColor(39, 174, 96)
      doc.text("PAID IN FULL", 105, finalY + 20, { align: "center" })

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text("Authorized Signature", 150, finalY + 40)
      doc.line(120, finalY + 35, 180, finalY + 35)

      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text("Thank you for your business!", 105, finalY + 55, { align: "center" })

      // 5. Save
      doc.save(`receipt-shipment-${partial.id}.pdf`)

      toast({ title: "Success", description: "Receipt generated successfully." })
    } catch (error) {
      console.error("Error generating receipt:", error)
      toast({
        title: "Error",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGeneratingReceiptId(null)
    }
  }

  const handleGenerateArrangementInvoice = async (partialShipmentId: number) => {
    try {
      // Ask user if they want the full 2-page invoice or a basic 1-page invoice.
      const includeFinancialInfo = window.confirm(
        "Do you want to include financial information in the invoice?\n\n" +
          "Click 'OK' for the complete invoice (2 pages with financial details).\n" +
          "Click 'Cancel' for basic invoice (1 page without financial details).",
      )

      const exchangeRate = 3.67 // AED -> USD exchange rate
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partialShipmentIds: [partialShipmentId] }),
      })

      if (!response.ok) throw new Error("Failed to generate invoice")

      const invoiceData = await response.json()
      console.log("Invoice API response:", invoiceData)

      const doc = new jsPDF()

      // ---------- PAGE 1: Basic Shipment / Package Info ---------- //

      // 1) Add company logo
      const logoUrl = "/zaxonLogo-removebg-preview.png"
      const logoImg = await loadImage(logoUrl)
      const imgWidth = 60
      doc.addImage(logoImg, "PNG", doc.internal.pageSize.width - imgWidth - 15, 10, imgWidth, 30)

      // 2) Title and batch reference
      doc.setFontSize(18)
      doc.text("Shipment Order", 14, 22)
      doc.setFontSize(12)
      doc.text(`Batch #${shipment?.id.toString().padStart(6, "0")}`, 14, 30)

      invoiceData.partials.forEach((partial: PartialShipment) => {
        // Track total weight & volume across all packages
        let packageTotalWeight = 0
        let packageTotalVolume = 0
        const generationDate = new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })

        // Build rows for package details from each package
        const packageDetails: any[] = []
        partial.packages?.forEach((pkg, idx) => {
          const units = pkg.units || 1
          const weight = (pkg.weight || 0) * units
          const volume = pkg.length && pkg.width && pkg.height ? pkg.length * pkg.width * pkg.height * units : 0

          packageTotalWeight += weight
          packageTotalVolume += volume

          // Package main details
          const description = pkg.description || `Package ${idx + 1} details`
          const dimensions =
            pkg.length && pkg.width && pkg.height ? `Dimensions: ${pkg.length}m × ${pkg.width}m × ${pkg.height}m` : ""
          const weightInfo = `Weight: ${weight}kg`
          const unitsInfo = `Units: ${units} ${pkg.typeOfPackage || "General"}`
          const specs = [dimensions, weightInfo, unitsInfo].filter(Boolean).join("\n")

          packageDetails.push([description, specs])
        })

        // Build the main table rows for autoTable.
        const tableRows = [
          ["Shipment ID", `#${partial.id.toString().padStart(6, "0")}`],
          ["Generated Date", generationDate],
          [
            "Shipper",
            [partial.customer?.name, partial.customer?.phone, partial.customer?.address].filter(Boolean).join("\n") ||
              "N/A",
          ],
          [
            "Consignee",
            [partial.receiverName, partial.receiverPhone, partial.receiverAddress].filter(Boolean).join("\n") || "N/A",
          ],
          // Insert package details rows.
          ...packageDetails,
          ["Total Weight", `${packageTotalWeight} kg`],
          ["Total Volume", `${packageTotalVolume.toFixed(3)} m³`],
        ]

        // Append the note row after totals, if a note exists.
        if (partial.note?.content) {
          tableRows.push([
            {
              content: `Note: ${partial.note.content}`,
              colSpan: 2,
              styles: { textColor: [255, 0, 0] },
            },
          ])
        }
        // Draw the first-page table.
        ;(doc as any).autoTable({
          startY: 40,
          head: [["Package Info", "Package Specifications"]],
          body: tableRows,
          theme: "grid",
          styles: { fontSize: 10 },
          headStyles: { fillColor: [41, 128, 185] },
          margin: { top: 45 },
        })

        // ---------- PAGE 2: Merged Package Costs + Financials ---------- //
        if (includeFinancialInfo) {
          doc.addPage()

          // Summaries we need
          const baseCost = partial.cost || 0
          const extraCost =
            partial.extraCostAmount !== undefined && partial.extraCostAmount !== null ? partial.extraCostAmount : 0
          const discountAED = partial.discountAmount || 0
          const paidAED = partial.amountPaid || 0
          const totalCostAED = baseCost + extraCost
          const balanceAED = totalCostAED - paidAED - discountAED
          const balanceUSD = (balanceAED / exchangeRate).toFixed(2)

          // Build a table combining package costs and financial summaries.
          const mergedBody: any[] = []

          // (1) Package-level rows.
          partial.packages?.forEach((pkg, idx) => {
            const units = pkg.units || 1
            const pkgWeight = (pkg.weight || 0) * units
            const pkgVolume = pkg.length && pkg.width && pkg.height ? pkg.length * pkg.width * pkg.height * units : 0

            let pricePerLabel = ""
            if (pkg.costType == "KG") {
              pricePerLabel = "AED/kg"
            } else if (pkg.costType === "CBM" || pkg.costType === "Volume" || pkg.costType == "CPM") {
              pricePerLabel = "AED/m³"
            } else {
              pricePerLabel = "AED/unit"
            }

            let rate = 0
            if (pkg.costType === "KG") {
              if (pkgWeight > 0) rate = (pkg.totalCost || 0) / pkgWeight
            } else if (pkg.costType === "CBM" || pkg.costType === "Volume" || pkg.costType === "CPM") {
              if (pkgVolume > 0) rate = (pkg.totalCost || 0) / pkgVolume
            } else {
              rate = units > 0 ? (pkg.totalCost || 0) / units : 0
            }

            mergedBody.push([
              (idx + 1).toString(),
              pkg.typeOfPackage || "General",
              `${pkgWeight.toFixed(2)} kg`,
              `${pkgVolume.toFixed(3)} m³`,
              units.toString(),
              `${rate.toFixed(2)} ${pricePerLabel}`,
              `${(pkg.totalCost || 0).toFixed(2)} AED`,
            ])
          })

          // (2) Financial summary rows.
          mergedBody.push([{ content: "", colSpan: 5 }, "Base Cost", `${baseCost.toFixed(2)} AED`])

          if (extraCost !== 0) {
            const extraLabel = partial.extraCostReason ? `Extra Cost (${partial.extraCostReason})` : "Extra Cost"
            mergedBody.push([{ content: "", colSpan: 5 }, extraLabel, `${extraCost.toFixed(2)} AED`])
          }

          if (discountAED !== 0) {
            mergedBody.push([{ content: "", colSpan: 5 }, "Discount", `-${discountAED.toFixed(2)} AED`])
          }

          if (paidAED !== 0) {
            mergedBody.push([{ content: "", colSpan: 5 }, "Amount Paid", `${paidAED.toFixed(2)} AED`])
          }

          mergedBody.push([
            { content: "", colSpan: 5 },
            "Balance Due",
            `${balanceAED.toFixed(2)} AED (${balanceUSD} USD)`,
          ])

          mergedBody.push([
            { content: "", colSpan: 5 },
            "Payment Status",
            partial.paymentStatus?.toUpperCase() || "PENDING",
          ])

          if (partial.paymentStatus !== "paid") {
            mergedBody.push([
              { content: "", colSpan: 5 },
              "Payment Responsibility",
              partial.paymentResponsibility || "Not specified",
            ])
          }
          // Generate the merged table.
          ;(doc as any).autoTable({
            startY: 30,
            head: [["No.", "Package Type", "Weight", "Volume", "Units", "Price/Unit", "Subtotal (AED)"]],
            body: mergedBody,
            theme: "grid",
            styles: { fontSize: 10 },
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: {
              2: { halign: "right" },
              3: { halign: "right" },
              4: { halign: "right" },
              5: { halign: "right" },
              6: { halign: "right" },
            },
          })

          // Duplicate total balance as a bold, large, red line at the bottom of page 2.
          const finalYFinancial = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 30
          doc.setFontSize(16)
          doc.setTextColor(255, 0, 0)
          doc.text(
            `TOTAL BALANCE DUE: ${balanceAED.toFixed(2)} AED (${balanceUSD} USD)`,
            doc.internal.pageSize.getWidth() / 2,
            finalYFinancial + 15,
            { align: "center" },
          )
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(10)
        }
      })

      // ---------- STYLISH BANK DETAILS FOOTER ON LAST PAGE ---------- //
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      const boxX = 14
      const lineHeight = 6
      const boxHeight = lineHeight * 8 + 10
      const boxWidth = pageWidth - 28
      const boxBottomMargin = 12
      const minTableGap = 8
      let boxY = pageHeight - boxHeight - boxBottomMargin

      const lastTable = (doc as any).lastAutoTable
      const lastTableY = lastTable?.finalY ?? 0
      if (lastTableY + minTableGap > boxY) {
        doc.addPage()
        boxY = pageHeight - boxHeight - boxBottomMargin
      }

      // Draw a light gray box as the background
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F")

      // Section title
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(41, 128, 185)
      doc.text("Bank Transfer Details", boxX + 4, boxY + 8)

      // Bank details content
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)

      const bankFields = [
        ["BANK NAME", "ABU DHABI ISLAMIC BANK (ADIB)"],
        ["BRANCH NAME", "AL QUSAIS BRANCH"],
        ["ACCOUNT NAME", "ZAXON LOGISTICS DWC LLC"],
        ["ACCOUNT NUMBER", "19373976"],
        ["IBAN NUMBER", "AE540500000000019373976"],
        ["CURRENCY", "AED"],
        ["SWIFT CODE", "ABDIAEAD"],
      ]

      bankFields.forEach(([label, value], i) => {
        const y = boxY + 16 + i * lineHeight
        doc.setFont("helvetica", "bold")
        doc.text(`${label}:`, boxX + 6, y)
        doc.setFont("helvetica", "normal")
        doc.text(value, boxX + 60, y)
      })

      // Choose filename and save the PDF.
      const invoiceType = includeFinancialInfo ? "full" : "basic"
      const filename = `batch-${shipment?.id}-shipment-${partialShipmentId}-invoice-${invoiceType}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast({
        title: "Document Error",
        description: "Failed to generate shipment document",
        variant: "destructive",
      })
    }
  }

  // Helper function to load image
  const loadImage = async (url: string): Promise<string> => {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  const handleWhatsAppCustomer = (phone: string | null) => {
    if (!phone) {
      toast({
        title: "Error",
        description: "Customer phone number not available.",
        variant: "destructive",
      })
      return
    }
    const message = encodeURIComponent("Hello, regarding your shipment order...")
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank")
  }

  const handleWhatsAppReceiver = (phone: string | null) => {
    if (!phone) {
      toast({
        title: "Error",
        description: "Receiver phone number not available.",
        variant: "destructive",
      })
      return
    }
    const message = encodeURIComponent("Hello, regarding your delivery...")
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank")
  }

  const handleDownloadZebraFile = async (partialShipmentId: number) => {
    const partial = shipment?.partialShipments.find((p) => p.id === partialShipmentId)
    if (!partial) {
      toast({
        title: "Error",
        description: "Partial shipment not found.",
        variant: "destructive",
      })
      return
    }
    if (!partial.packages || partial.packages.length === 0) {
      toast({
        title: "Error",
        description: "No packages available for zebra label.",
        variant: "destructive",
      })
      return
    }
    if (!shipment) {
      toast({
        title: "Error",
        description: "Shipment data not loaded.",
        variant: "destructive",
      })
      return
    }

    // Determine destination suffix
    let destinationSuffix = "SY" // Default to Syria
    if (shipment.destination.toLowerCase().includes("saudia")) {
      destinationSuffix = "KA"
    }
    if (shipment.destination.toLowerCase().includes("UAE")) {
      destinationSuffix = "UAE"
    }

    // Get customer initials (e.g., "feras taieb" becomes "ft")
    const customerInitials = partial.customer?.name
      ? partial.customer.name
          .trim()
          .split(/\s+/)
          .map((word) => word.charAt(0).toLowerCase())
          .join("")
      : "unknown"

    // Clean receiver phone: if it starts with +971, +963, or +966, replace with "0"
    const cleanReceiverPhone = partial.receiverPhone ? partial.receiverPhone.replace(/^\+(971|963|966)/, "0") : ""
    // Calculate total labels
    const totalLabels = partial.packages.reduce((acc, pkg) => acc + (pkg.units || 1), 0)
    let labelCounter = 0
    let zplContent = ""

    // Generate ZPL content for all packages
    partial.packages.forEach((pkg) => {
      const units = pkg.units || 1
      for (let i = 0; i < units; i++) {
        labelCounter++
        const customId = `${shipment.id}${destinationSuffix}${cleanReceiverPhone}${customerInitials.toUpperCase()}${labelCounter}/${totalLabels}`

        zplContent += `^XA
^LL650
^FO50,50^GB60,60,2^FS
^FO65,65^FR^GB60,60,2^FS
^FO75,75^GB25,25,2^FS
^CF0,40
^FO150,70^FDZaxon .inc^FS
^A0N,160,160
^FO300,120^FD${labelCounter}/${totalLabels}^FS
^FO50,300^GB700,120,2^FS
^FO400,300^GB3,120,2^FS
^CF0,30
^FO80,340^FD${customId}^FS
^CF0,100
^FO420,320^FD${destinationSuffix}^FS
^XZ
`
      }
    })

    try {
      const blob = new Blob([zplContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const customerName = partial.customer?.name.replace(/\s+/g, "_") || "unknown"
      link.href = url
      link.setAttribute("download", `${shipment.id}_${customerName}.zpl`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate zebra labels. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShowIncompleteOnlyChange = () => {
    setShowIncompleteOnly(!showIncompleteOnly)
  }

  /* ─────────────────────  NEW: Close batch  ─────────────────────── */
  const handleCloseShipment = async () => {
    if (!driverName.trim() || !driverVehicle.trim()) {
      toast({
        title: "Error",
        description: "Please enter both driver name and vehicle information.",
        variant: "destructive",
      })
      return
    }
    setIsClosing(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOpen: false,
          driverName,
          driverVehicle,
          dateClosed: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error("Failed to close shipment")
      toast({ title: "Success", description: "Batch closed." })
      router.push("/shipments/closed")
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsClosing(false)
    }
  }

  const handleDeleteBatch = async () => {
    if (!shipment) return
    if (!confirm("Delete this batch? This action cannot be undone.")) return

    setIsDeletingBatch(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        let message = "Failed to delete batch."
        try {
          const errorData = await res.json()
          if (errorData?.error) {
            message = errorData.error
          }
        } catch {}
        throw new Error(message)
      }

      toast({ title: "Success", description: "Batch deleted." })
      router.push("/shipments")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete batch."
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setIsDeletingBatch(false)
    }
  }

  // Handler for updating discount amount
  const handleUpdateDiscount = async () => {
    if (!selectedPartial || !shipment) return
    setIsLoadingDiscount(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment.id}/partial-shipments/${selectedPartial.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discountAmount: Number.parseFloat(newDiscount) || 0,
          }),
        },
      )
      if (!response.ok) throw new Error("Failed to update discount")

      // Close dialog first before any other state changes
      setDiscountDialogOpen(false)

      // Then reset the form state
      setSelectedPartial(null)
      setNewDiscount("")

      // Then show success message
      toast({ title: "Success", description: "Discount updated." })

      // Finally refresh data
      fetchShipmentDetails()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error updating discount"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingDiscount(false)
    }
  }

  // Handler for adding extra cost
  const handleAddExtraCost = async () => {
    if (!selectedExtraCostPartial || !shipment) return
    setIsLoadingExtraCost(true)
    try {
      const extraCostAmountNumber = Number.parseFloat(extraCostAmountInput) || 0
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment.id}/partial-shipments/${selectedExtraCostPartial.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extraCostReason: extraCostReasonInput,
            extraCostAmount: extraCostAmountNumber,
          }),
        },
      )
      if (!response.ok) throw new Error("Failed to add extra cost")

      // Close dialog first before any other state changes
      setExtraCostDialogOpen(false)

      // Then reset the form state
      setSelectedExtraCostPartial(null)
      setExtraCostReasonInput("")
      setExtraCostAmountInput("")

      // Then show success message
      toast({ title: "Success", description: "Extra cost added." })

      // Finally refresh data
      fetchShipmentDetails()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error adding extra cost"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingExtraCost(false)
    }
  }

  const openDiscountDialog = (partial: PartialShipment) => {
    // First reset any existing state
    setSelectedPartial(null)
    setNewDiscount("")

    // Then set the new state
    setTimeout(() => {
      setNewDiscount(partial.discountAmount !== undefined ? partial.discountAmount.toString() : "0")
      setSelectedPartial(partial)
      // Open the dialog last
      setTimeout(() => {
        setDiscountDialogOpen(true)
      }, 50)
    }, 50)
  }

  const openAddExtraCostDialog = (partial: PartialShipment) => {
    // First reset any existing state
    setSelectedExtraCostPartial(null)
    setExtraCostReasonInput("")
    setExtraCostAmountInput("")

    // Then set the new state
    setTimeout(() => {
      setExtraCostReasonInput("")
      setExtraCostAmountInput("")
      setSelectedExtraCostPartial(partial)
      // Open the dialog last
      setTimeout(() => {
        setExtraCostDialogOpen(true)
      }, 50)
    }, 50)
  }

  const openTransferDialog = (partial: PartialShipment) => {
    setSelectedTransferPartial(partial)
    setTransferTargetId("")
    setTransferDialogOpen(true)
    if (!openShipments.length) {
      fetchOpenShipments()
    }
  }

  const resetTransferDialog = () => {
    setTransferDialogOpen(false)
    setSelectedTransferPartial(null)
    setTransferTargetId("")
  }

  const handleTransferPartial = async () => {
    if (!shipment || !selectedTransferPartial) return
    const targetId = Number.parseInt(transferTargetId, 10)
    if (!Number.isFinite(targetId)) {
      toast({
        title: "Error",
        description: "Please select a valid target batch.",
        variant: "destructive",
      })
      return
    }
    if (targetId === shipment.id) {
      toast({
        title: "Error",
        description: "Select a different batch to transfer to.",
        variant: "destructive",
      })
      return
    }

    setIsTransferring(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment.id}/partial-shipments/${selectedTransferPartial.id}/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetShipmentId: targetId }),
        },
      )

      if (!response.ok) {
        let message = "Failed to transfer partial shipment."
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            message = errorData.error
          }
        } catch {}
        throw new Error(message)
      }

      resetTransferDialog()
      toast({ title: "Success", description: "Partial shipment transferred." })
      fetchShipmentDetails({ silent: true })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error transferring partial shipment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsTransferring(false)
    }
  }

  const availableTargets = shipment
    ? openShipments.filter((batch) => batch.id !== shipment.id)
    : []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!shipment) {
    return <div className="text-center p-8">Shipment not found</div>
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Partial Shipments</h1>
            <p className="text-gray-300">
              Batch #{shipment.id} to {shipment.destination}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/shipments/${id}/add-partial`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Partial
            </Button>
            {shipment.isOpen && (
              <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
                <Button type="button" variant="destructive" onClick={() => setCloseOpen(true)}>
                  Close Batch
                </Button>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-[#2C3E50] flex items-center">
                      <Truck className="mr-2 h-5 w-5 text-[#E74C3C]" />
                      Close Batch
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="driverName" className="text-right text-[#2C3E50]">
                        Driver Name
                      </Label>
                      <Input
                        id="driverName"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="driverVehicle" className="text-right text-[#2C3E50]">
                        Vehicle Info
                      </Label>
                      <Input
                        id="driverVehicle"
                        value={driverVehicle}
                        onChange={(e) => setDriverVehicle(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCloseShipment}
                    disabled={isClosing}
                    className="bg-[#E74C3C] hover:bg-[#C0392B] text-white"
                  >
                    {isClosing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Closing…
                      </>
                    ) : (
                      "Confirm Close"
                    )}
                  </Button>
                </DialogContent>
              </Dialog>
            )}
            {shipment.isOpen && (
              <Button type="button" variant="destructive" onClick={handleDeleteBatch} disabled={isDeletingBatch}>
                {isDeletingBatch ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Batch"
                )}
              </Button>
            )}
          </div>
        </div>

        <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#1ABC9C]">
        <CardHeader className="bg-gradient-to-r from-[#E8F8F5] to-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-[#2C3E50] flex items-center">
              <Package className="mr-2 h-5 w-5 text-[#1ABC9C]" />
              Batch Summary
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                onClick={handleDownloadItemsExcel}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Download Items Excel
              </Button>
              <Button
                onClick={handleDownloadHandoverInfo}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Download Handover Info
              </Button>
            </div>
          </div>
        </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-800">{shipment.partialShipments.length}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Weight</p>
              <p className="text-2xl font-bold text-gray-800">{shipment.totalWeight.toFixed(2)} kg</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Volume</p>
              <p className="text-2xl font-bold text-gray-800">{shipment.totalVolume.toFixed(3)} m³</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Income</p>
              <div>
                <p className="text-2xl font-bold text-gray-800">{calculateTotalBatchCost().total.toFixed(2)} AED</p>
                <div className="text-xs text-gray-500 mt-1">
                  <div>Base: {calculateTotalBatchCost().baseCost.toFixed(2)} AED</div>
                  {calculateTotalBatchCost().extraCost > 0 && (
                    <div className="text-red-600">Extra: +{calculateTotalBatchCost().extraCost.toFixed(2)} AED</div>
                  )}
                  {calculateTotalBatchCost().discount > 0 && (
                    <div className="text-green-600">Discount: -{calculateTotalBatchCost().discount.toFixed(2)} AED</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <TabsList className="mb-4 md:mb-0">
                <TabsTrigger value="all">All Shipments</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
              </TabsList>

              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search shipments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showIncompleteOnly"
                    checked={showIncompleteOnly}
                    onCheckedChange={handleShowIncompleteOnlyChange}
                  />
                  <Label htmlFor="showIncompleteOnly" className="text-white">
                    Show incomplete only
                  </Label>
                </div>
              </div>
            </div>

            <TabsContent value="all" className="mt-0">
              <ShipmentTable
                partialShipments={filteredPartialShipments}
                onMarkPaymentDone={handleMarkPaymentDone}
                onDelete={handleDeletePartialShipment}
                onGenerateReceipt={generateReceipt}
                onEdit={(partial) => {
                  setToEdit(partial)
                  setEditOpen(true)
                }}
                onGenerateInvoice={handleGenerateArrangementInvoice}
                onWhatsAppCustomer={handleWhatsAppCustomer}
                onWhatsAppReceiver={handleWhatsAppReceiver}
                onDownloadZebraFile={handleDownloadZebraFile}
                onOpenDiscountDialog={openDiscountDialog}
                onOpenExtraCostDialog={openAddExtraCostDialog}
                onTransfer={openTransferDialog}
                onCompleteInfo={(id) => (window.location.href = `/partial-shipment/${id}`)}
                processingPaymentId={processingPaymentId}
                generatingReceiptId={generatingReceiptId}
                baseUrl={baseUrl}
                allowTransfer={shipment.isOpen}
              />
            </TabsContent>

            <TabsContent value="paid" className="mt-0">
              <ShipmentTable
                partialShipments={filteredPartialShipments}
                onMarkPaymentDone={handleMarkPaymentDone}
                onDelete={handleDeletePartialShipment}
                onGenerateReceipt={generateReceipt}
                onEdit={(partial) => {
                  setToEdit(partial)
                  setEditOpen(true)
                }}
                onGenerateInvoice={handleGenerateArrangementInvoice}
                onWhatsAppCustomer={handleWhatsAppCustomer}
                onWhatsAppReceiver={handleWhatsAppReceiver}
                onDownloadZebraFile={handleDownloadZebraFile}
                onOpenDiscountDialog={openDiscountDialog}
                onOpenExtraCostDialog={openAddExtraCostDialog}
                onTransfer={openTransferDialog}
                onCompleteInfo={(id) => (window.location.href = `/partial-shipment/${id}`)}
                processingPaymentId={processingPaymentId}
                generatingReceiptId={generatingReceiptId}
                baseUrl={baseUrl}
                allowTransfer={shipment.isOpen}
              />
            </TabsContent>

            <TabsContent value="unpaid" className="mt-0">
              <ShipmentTable
                partialShipments={filteredPartialShipments}
                onMarkPaymentDone={handleMarkPaymentDone}
                onDelete={handleDeletePartialShipment}
                onGenerateReceipt={generateReceipt}
                onEdit={(partial) => {
                  setToEdit(partial)
                  setEditOpen(true)
                }}
                onGenerateInvoice={handleGenerateArrangementInvoice}
                onWhatsAppCustomer={handleWhatsAppCustomer}
                onWhatsAppReceiver={handleWhatsAppReceiver}
                onDownloadZebraFile={handleDownloadZebraFile}
                onOpenDiscountDialog={openDiscountDialog}
                onOpenExtraCostDialog={openAddExtraCostDialog}
                onTransfer={openTransferDialog}
                onCompleteInfo={(id) => (window.location.href = `/partial-shipment/${id}`)}
                processingPaymentId={processingPaymentId}
                generatingReceiptId={generatingReceiptId}
                baseUrl={baseUrl}
                allowTransfer={shipment.isOpen}
              />
            </TabsContent>

            <TabsContent value="incomplete" className="mt-0">
              <ShipmentTable
                partialShipments={filteredPartialShipments}
                onMarkPaymentDone={handleMarkPaymentDone}
                onDelete={handleDeletePartialShipment}
                onGenerateReceipt={generateReceipt}
                onEdit={(partial) => {
                  setToEdit(partial)
                  setEditOpen(true)
                }}
                onGenerateInvoice={handleGenerateArrangementInvoice}
                onWhatsAppCustomer={handleWhatsAppCustomer}
                onWhatsAppReceiver={handleWhatsAppReceiver}
                onDownloadZebraFile={handleDownloadZebraFile}
                onOpenDiscountDialog={openDiscountDialog}
                onOpenExtraCostDialog={openAddExtraCostDialog}
                onTransfer={openTransferDialog}
                onCompleteInfo={(id) => (window.location.href = `/partial-shipment/${id}`)}
                processingPaymentId={processingPaymentId}
                generatingReceiptId={generatingReceiptId}
                baseUrl={baseUrl}
                allowTransfer={shipment.isOpen}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Transfer Dialog */}
        <Dialog
          open={transferDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetTransferDialog()
              return
            }
            setTransferDialogOpen(open)
          }}
        >
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#2C3E50]">Transfer to Another Batch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {selectedTransferPartial && (
                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                  <div className="font-medium text-gray-800">
                    Partial Shipment #{selectedTransferPartial.id}
                  </div>
                  <div>{selectedTransferPartial.customer?.name || "Unknown customer"}</div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transferTarget" className="text-right text-[#2C3E50]">
                  Target Batch
                </Label>
                <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                  <SelectTrigger id="transferTarget" className="col-span-3">
                    <SelectValue
                      placeholder={isLoadingBatches ? "Loading batches..." : "Select a batch"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTargets.length ? (
                      availableTargets.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id.toString()}>
                          Batch #{batch.id} to {batch.destination}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No open batches available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTransferDialogOpen(false)
                  setSelectedTransferPartial(null)
                  setTransferTargetId("")
                }}
                className="bg-gray-200 text-[#2C3E50] hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleTransferPartial}
                disabled={
                  isTransferring || !transferTargetId || !selectedTransferPartial || !shipment.isOpen
                }
                className="bg-[#3498DB] text-white hover:bg-[#2980B9]"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Transfer"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Discount Edit Dialog - Improved version */}
        <Dialog
          open={discountDialogOpen}
          onOpenChange={(open) => {
            // Always allow closing the dialog
            if (!open) {
              setDiscountDialogOpen(false)
              // Reset state when dialog closes
              setTimeout(() => {
                setSelectedPartial(null)
                setNewDiscount("")
              }, 100)
            } else {
              setDiscountDialogOpen(open)
            }
          }}
        >
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#2C3E50]">Edit Discount Amount</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right text-[#2C3E50]">
                  Discount Amount (AED)
                </Label>
                <Input
                  id="discount"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="col-span-3"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDiscountDialogOpen(false)
                  // Reset state when dialog closes via button
                  setTimeout(() => {
                    setSelectedPartial(null)
                    setNewDiscount("")
                  }, 100)
                }}
                className="bg-gray-200 text-[#2C3E50] hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateDiscount}
                disabled={isLoadingDiscount}
                className="bg-[#3498DB] text-white hover:bg-[#2980B9]"
              >
                {isLoadingDiscount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Extra Cost Dialog - Improved version */}
        <Dialog
          open={extraCostDialogOpen}
          onOpenChange={(open) => {
            // Always allow closing the dialog
            if (!open) {
              setExtraCostDialogOpen(false)
              // Reset state when dialog closes
              setTimeout(() => {
                setSelectedExtraCostPartial(null)
                setExtraCostReasonInput("")
                setExtraCostAmountInput("")
              }, 100)
            } else {
              setExtraCostDialogOpen(open)
            }
          }}
        >
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#2C3E50]">Add Extra Cost</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="extraCostReason" className="text-right text-[#2C3E50]">
                  Reason
                </Label>
                <Input
                  id="extraCostReason"
                  value={extraCostReasonInput}
                  onChange={(e) => setExtraCostReasonInput(e.target.value)}
                  placeholder="e.g. handling fees"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="extraCostAmount" className="text-right text-[#2C3E50]">
                  Amount (AED)
                </Label>
                <Input
                  id="extraCostAmount"
                  type="number"
                  step="0.01"
                  value={extraCostAmountInput}
                  onChange={(e) => setExtraCostAmountInput(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExtraCostDialogOpen(false)
                  // Reset state when dialog closes via button
                  setTimeout(() => {
                    setSelectedExtraCostPartial(null)
                    setExtraCostReasonInput("")
                    setExtraCostAmountInput("")
                  }, 100)
                }}
                className="bg-gray-200 text-[#2C3E50] hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddExtraCost}
                disabled={isLoadingExtraCost}
                className="bg-[#8E44AD] text-white hover:bg-[#9B59B6]"
              >
                {isLoadingExtraCost ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Extra Cost...
                  </>
                ) : (
                  "Save Extra Cost"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <EditPartialShipmentDialog
        shipmentId={shipment.id}
        partial={toEdit}
        customers={customers}
        open={editOpen}
        onOpenChange={(open) => setEditOpen(open)}
        onSaved={() => fetchShipmentDetails()}
      />
    </ProtectedRoute>
  )
}
