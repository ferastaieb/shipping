"use client"

import { useState, Fragment } from "react"
import {
  ArrowRightLeft,
  CheckCircle,
  Download,
  Edit,
  FileText,
  Loader2,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import type { PartialShipment } from "../types/shipping"

interface ShipmentTableProps {
  partialShipments: PartialShipment[]
  onMarkPaymentDone: (id: number) => void
  onDelete: (id: number) => void
  onGenerateReceipt: (partial: PartialShipment) => void
  onEdit: (partial: PartialShipment) => void
  onGenerateInvoice: (id: number) => void
  onWhatsAppCustomer: (phone: string | null) => void
  onWhatsAppReceiver: (phone: string | null) => void
  onDownloadZebraFile: (id: number) => void
  onOpenDiscountDialog: (partial: PartialShipment) => void
  onOpenExtraCostDialog: (partial: PartialShipment) => void
  onCompleteInfo: (id: number) => void
  onTransfer: (partial: PartialShipment) => void
  processingPaymentId: number | null
  generatingReceiptId: number | null
  baseUrl: string
  allowTransfer?: boolean
}

export default function ShipmentTable({
  partialShipments,
  onMarkPaymentDone,
  onDelete,
  onGenerateReceipt,
  onEdit,
  onGenerateInvoice,
  onWhatsAppCustomer,
  onWhatsAppReceiver,
  onDownloadZebraFile,
  onOpenDiscountDialog,
  onOpenExtraCostDialog,
  onCompleteInfo,
  onTransfer,
  processingPaymentId,
  generatingReceiptId,
  allowTransfer = true,
}: ShipmentTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const toggleExpandRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  if (partialShipments.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <p className="text-gray-500">No shipments found matching your criteria.</p>
      </div>
    )
  }

  return (
    <Card className="bg-white shadow-lg border-l-4 border-[#3498DB]">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="text-[#2C3E50] w-16">ID</TableHead>
                <TableHead className="text-[#2C3E50] w-[200px]">Customer</TableHead>
                <TableHead className="text-[#2C3E50] w-[200px]">Receiver</TableHead>
                <TableHead className="text-[#2C3E50] w-26">Weight (kg)</TableHead>
                <TableHead className="text-[#2C3E50] w-26">Volume (m³)</TableHead>
                <TableHead className="text-[#2C3E50] w-36">Income</TableHead>
                <TableHead className="text-[#2C3E50] w-32">Status</TableHead>
                <TableHead className="text-[#2C3E50]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partialShipments.map((partial, index) => {
                const isIncomplete = !partial.items || partial.items.length === 0
                const isPaid = partial.paymentStatus === "paid" || partial.paymentCompleted
                const hasExtraCost = partial.extraCostAmount && partial.extraCostAmount > 0
                const hasDiscount = partial.discountAmount && partial.discountAmount > 0

                return (
                  <Fragment key={partial.id}>
                    <TableRow
                      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                        isIncomplete ? "bg-yellow-50" : ""
                      } cursor-pointer hover:bg-gray-100`}
                      onClick={() => toggleExpandRow(partial.id)}
                    >
                      <TableCell className="font-medium">{partial.id}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {partial.customer ? (
                          <div className="overflow-hidden">
                            <div className="font-medium truncate" title={partial.customer.name}>
                              {partial.customer.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate" title={partial.customer.phone || ""}>
                              {partial.customer.phone}
                            </div>
                          </div>
                        ) : (
                          "Loading..."
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {partial.receiverName ? (
                          <div className="overflow-hidden">
                            <div className="font-medium truncate" title={partial.receiverName}>
                              {partial.receiverName}
                            </div>
                            <div className="text-xs text-gray-500 truncate" title={partial.receiverPhone || ""}>
                              {partial.receiverPhone}
                            </div>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {partial.packages
                          ? partial.packages
                              .reduce((sum, pkg) => sum + (pkg.weight ?? 0) * (pkg.units ?? 1), 0)
                              .toFixed(2)
                          : "N/A"}
                      </TableCell>
                      <TableCell>{partial.volume.toFixed(3)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{partial.cost.toFixed(2)} AED</div>
                        {hasDiscount && (
                          <div className="text-xs text-green-600">
                            Discount: {partial.discountAmount?.toFixed(2)} AED
                          </div>
                        )}
                        {hasExtraCost && (
                          <div className="text-xs text-red-600">
                            Extra: {partial.extraCostAmount?.toFixed(2)} AED
                            {partial.extraCostReason && <span> ({partial.extraCostReason})</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={`${
                              isPaid
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : partial.paymentStatus === "partially_paid"
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                  : "bg-red-100 text-red-800 hover:bg-red-100"
                            }`}
                          >
                            {isPaid ? "Paid" : partial.paymentStatus === "partially_paid" ? "Partially Paid" : "Unpaid"}
                            {partial.paymentCompleted ? " (Done)" : ""}
                          </Badge>
                          {isIncomplete && (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Incomplete</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(partial)
                            }}
                            className="bg-blue-500 text-white hover:bg-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only md:not-sr-only md:ml-2">Edit</span>
                          </Button>

                          {!isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onMarkPaymentDone(partial.id)
                              }}
                              disabled={processingPaymentId === partial.id}
                              className="bg-green-500 text-white hover:bg-green-600"
                            >
                              {processingPaymentId === partial.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              <span className="sr-only md:not-sr-only md:ml-2">Mark Paid</span>
                            </Button>
                          )}

                          {isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onGenerateReceipt(partial)
                              }}
                              disabled={generatingReceiptId === partial.id}
                              className="bg-purple-500 text-white hover:bg-purple-600"
                            >
                              {generatingReceiptId === partial.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              <span className="sr-only md:not-sr-only md:ml-4">Receipt</span>
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {isIncomplete && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onCompleteInfo(partial.id)
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Complete Info
                                </DropdownMenuItem>
                              )}

                              {allowTransfer && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onTransfer(partial)
                                  }}
                                >
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                  Transfer to Batch
                                </DropdownMenuItem>
                              )}

                              {!partial.extraCostReason && !partial.extraCostAmount && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onOpenExtraCostDialog(partial)
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Add Extra Cost
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onGenerateInvoice(partial.id)
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Arrangement Invoice
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onWhatsAppCustomer(partial.customer ? partial.customer.phone : null)
                                }}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                WhatsApp Customer
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onWhatsAppReceiver(partial.receiverPhone)
                                }}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                WhatsApp Receiver
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDownloadZebraFile(partial.id)
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download Zebra Label
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onOpenDiscountDialog(partial)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Discount
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(partial.id)
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Shipment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row with note and additional details */}
                    {expandedRow === partial.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* ─── Note column (text only) ─── */}
                            <div className="border rounded-lg bg-white p-4">
                              <h4 className="font-semibold text-[#2C3E50] mb-2">Note</h4>
                              {partial.note?.content ? (
                                <p className="text-sm text-gray-600">{partial.note.content}</p>
                              ) : (
                                <p className="italic text-gray-500">No note available</p>
                              )}
                            </div>

                            {/* ─── Payment Details column ─── */}
                            <div className="border rounded-lg bg-white p-4">
                              <h4 className="font-semibold text-[#2C3E50] mb-2">Payment Details</h4>
                              {(() => {
                                const rows: [string, string][] = []

                                // Base cost
                                rows.push(["Base Cost", `${partial.cost.toFixed(2)} AED`])

                                // Extra cost
                                if (partial.extraCostAmount && partial.extraCostAmount > 0) {
                                  rows.push(["Extra Cost", `${partial.extraCostAmount.toFixed(2)} AED`] as [
                                    string,
                                    string,
                                  ])
                                  if (partial.extraCostReason) {
                                    rows.push(["Reason", partial.extraCostReason] as [string, string])
                                  }
                                }

                                // Discount
                                if (partial.discountAmount && partial.discountAmount > 0) {
                                  rows.push(["Discount", `-${partial.discountAmount.toFixed(2)} AED`] as [
                                    string,
                                    string,
                                  ])
                                }

                                // Amount paid
                                rows.push(["Amount Paid", `${partial.amountPaid.toFixed(2)} AED`])

                                // Balance
                                const balance =
                                  partial.cost +
                                  (partial.extraCostAmount || 0) -
                                  (partial.discountAmount || 0) -
                                  partial.amountPaid
                                rows.push(["Balance", `${balance.toFixed(2)} AED`] as [string, string])

                                // Responsibility
                                rows.push(["Responsibility", partial.paymentResponsibility || "Not specified"] as [
                                  string,
                                  string,
                                ])

                                return (
                                  <div className="space-y-2 text-sm">
                                    {rows.map(([label, value], i) => (
                                      <div key={i} className="flex justify-between">
                                        <span className="font-medium text-gray-600">{label}:</span>
                                        <span>{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
