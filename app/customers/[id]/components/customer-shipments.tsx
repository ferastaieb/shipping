"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { CheckCircle } from "lucide-react"

interface ShipmentInfo {
  id: number
  destination: string
  dateClosed: string | null
}

interface PartialShipment {
  id: number
  cost: number
  amountPaid: number
  paymentStatus: string | null
  paymentCompleted: boolean
  shipmentId: number
  shipment?: ShipmentInfo
  paymentResponsibility?: string
  note?: Note
}

interface CustomerShipmentsProps {
  customerId: number
}

interface Note {
  content?: string
}

async function getCustomerShipments(customerId: number): Promise<PartialShipment[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customerId}?includeShipments=true`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch customer shipments")
  }
  const data = await res.json()
  return data.partialShipments
}

export default function CustomerShipments({ customerId }: CustomerShipmentsProps) {
  const [shipments, setShipments] = useState<PartialShipment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editNoteOpen, setEditNoteOpen] = useState(false)
  const [currentEditingPartial, setCurrentEditingPartial] = useState<PartialShipment | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null)
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    getCustomerShipments(customerId)
      .then((data) => setShipments(data))
      .catch((error) => toast({ title: "Error", description: error.message, variant: "destructive" }))
      .finally(() => setIsLoading(false))
  }, [customerId])

  const openEditDialog = (partial: PartialShipment) => {
    setCurrentEditingPartial(partial)
    setNoteContent(partial.note ? partial.note.content || "" : "")
    setEditNoteOpen(true)
  }

  const handleNoteSave = async () => {
    if (!currentEditingPartial) return

    try {
      setSavingNote(true)
      const shipmentID = currentEditingPartial.shipment
        ? currentEditingPartial.shipment.id
        : currentEditingPartial.shipmentId

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipmentID}/partial-shipments/${currentEditingPartial.id}/note`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteContent }),
        },
      )

      if (!res.ok) throw new Error("Failed to update note")
      toast({ title: "Success", description: "Note updated." })

      // Optionally re-fetch the shipments list to reflect changes
      const updatedShipments = await getCustomerShipments(customerId)
      setShipments(updatedShipments)
      setEditNoteOpen(false)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update note"
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setSavingNote(false)
    }
  }
  const handleMarkPaymentDone = async (partialId: number, shipment: number) => {
    try {
      setProcessingPaymentId(partialId)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shipments/${shipment}/partial-shipments/${partialId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentCompleted: true, paymentStatus: "paid",
          }),
        },
      )
      if (!res.ok) throw new Error("Failed to mark payment as done")
      toast({ title: "Success", description: "Payment marked as done." })
      const updatedShipments = await getCustomerShipments(customerId)
      setShipments(updatedShipments)
    } catch (error: unknown) {
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

  if (isLoading) {
    return <p>Loading shipments...</p>
  }

  if (shipments.length === 0) {
    return <p>No shipments found for this customer.</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="text-[#2C3E50]">ID</TableHead>
            <TableHead className="text-[#2C3E50]">Shipment</TableHead>
            <TableHead className="text-[#2C3E50]">Date Closed</TableHead>
            <TableHead className="text-[#2C3E50]">Payment Status</TableHead>
            <TableHead className="text-[#2C3E50]">Outstanding</TableHead>
            <TableHead className="text-[#2C3E50]">Payment Responsibility</TableHead>
            <TableHead className="text-[#2C3E50]">Note</TableHead>
            <TableHead className="text-[#2C3E50]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((partial, index) => {
            const shipmentDest = partial.shipment ? partial.shipment.destination : partial.shipmentId.toString()
            const shipmentID = partial.shipment ? partial.shipment.id : partial.shipmentId
            const dateClosed =
              partial.shipment && partial.shipment.dateClosed
                ? new Date(partial.shipment.dateClosed).toLocaleString()
                : "N/A"
            const outstanding = partial.cost - partial.amountPaid
            return (
              <TableRow key={partial.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <TableCell>{partial.id}</TableCell>
                <TableCell>{shipmentDest}</TableCell>
                <TableCell>{dateClosed}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      partial.paymentCompleted || partial.paymentStatus == "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {partial.paymentStatus || "N/A"}{" "}
                    {partial.paymentCompleted || partial.paymentStatus == "paid" ? "(Done)" : ""}
                  </span>
                </TableCell>
                <TableCell>{outstanding > 0 ? `$${outstanding.toFixed(2)}` : "$0.00"}</TableCell>
                <TableCell>{partial.paymentResponsibility}</TableCell>
                <TableCell>
                  {partial.note ? partial.note.content : <em className="text-gray-500">No Note</em>}
                </TableCell>
                <TableCell>
                  {/* New Edit Note Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(partial)}
                    className="ml-2 bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Edit Note
                  </Button>
                  {!partial.paymentCompleted && partial.paymentStatus != "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkPaymentDone(partial.id, shipmentID)}
                      disabled={processingPaymentId === partial.id}
                      className="bg-[#27AE60] text-white hover:bg-[#2ECC71]"
                    >
                      {processingPaymentId === partial.id ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Payment Done
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {editNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Note</h3>
            <textarea
              className="w-full h-32 border p-2"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setEditNoteOpen(false)} variant="outline" className="mr-2">
                Cancel
              </Button>
              <Button
                onClick={handleNoteSave}
                disabled={savingNote}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {savingNote ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
