"use client"

import React, { useEffect, useState, useCallback, FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { PartialShipment, Customer } from "../types/shipping"

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type PackageDetail = {
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
}

type ItemDetail = {
  id?: number
  weight: string
  origin: string
  hscode: string
  priceByUnit: string
  quantity: string
  overallPrice: string
  unit: string
  description: string
}

interface Props {
  shipmentId: number
  partial: PartialShipment | null
  customers: Customer[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function EditPartialShipmentDialog({
  shipmentId,
  partial,
  customers,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  /* -------------------- state -------------------- */
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    cost: "",
    amountPaid: "",
    paymentStatus: "unpaid",
    extraCostReason: "",
    extraCostAmount: "",
  })
  const [paymentResponsibility, setPaymentResponsibility] =
    useState<"customer" | "receiver">("customer")

  const [packages, setPackages] = useState<PackageDetail[]>([])
  const [items, setItems] = useState<ItemDetail[]>([])

  /* -------------------- helpers -------------------- */
  const resetFromPartial = useCallback(() => {
    if (!partial) return

    /* general fields */
    setFormData({
      receiverName: partial.receiverName ?? "",
      receiverPhone: partial.receiverPhone ?? "",
      receiverAddress: partial.receiverAddress ?? "",
      cost: String(partial.cost ?? ""),
      amountPaid: String(partial.amountPaid ?? ""),
      paymentStatus: partial.paymentStatus ?? "unpaid",
      extraCostReason: partial.extraCostReason ?? "",
      extraCostAmount: String(partial.extraCostAmount ?? ""),
    })
    setPaymentResponsibility(
      (partial.paymentResponsibility ?? "customer") as "customer" | "receiver"
    )

    /* packages */
    setPackages(
      (partial.packages ?? []).map((p) => ({
        id: p.id,
        length: String(p.length ?? ""),
        width: String(p.width ?? ""),
        height: String(p.height ?? ""),
        weight: String(p.weight ?? ""),
        units: String(p.units ?? 1),
        typeOfPackage: p.typeOfPackage ?? "package",
        description: p.description ?? "",
        costType: p.costType ?? "CPM",
        totalCost: String(p.totalCost ?? ""),
      }))
    )

    /* items */
    setItems(
      (partial.items ?? []).map((i) => {
        const price = Number(i.priceByUnit ?? 0)
        const qty = Number(i.quantity ?? 0)
        return {
          id: i.id,
          weight: String(i.weight ?? ""),
          origin: i.origin ?? "",
          hscode: i.hscode ?? "",
          priceByUnit: String(i.priceByUnit ?? ""),
          quantity: String(i.quantity ?? ""),
          overallPrice: (price * qty).toFixed(2),
          unit: i.unit ?? "",
          description: i.description ?? "",
        }
      })
    )
  }, [partial])

  /* run when dialog opens / partial changes */
  useEffect(() => {
    resetFromPartial()
  }, [resetFromPartial])

  /* ---------- package helpers ---------- */
  const updatePackage = (i: number, field: keyof PackageDetail, v: string) =>
    setPackages((pkgs) =>
      pkgs.map((p, idx) => (idx === i ? { ...p, [field]: v } : p))
    )
  const removePackage = (i: number) =>
    setPackages((pkgs) => pkgs.filter((_, idx) => idx !== i))
  const addPackage = () =>
    setPackages((pkgs) => [
      ...pkgs,
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

  /* ---------- item helpers ---------- */
  const updateItem = (i: number, field: keyof ItemDetail, v: string) =>
    setItems((its) =>
      its.map((it, idx) => {
        if (idx !== i) return it
        const next = { ...it, [field]: v }
        /* keep overall price in sync */
        const qty = Number(
          field === "quantity" ? v : next.quantity || "0"
        )
        const price = Number(
          field === "priceByUnit" ? v : next.priceByUnit || "0"
        )
        next.overallPrice = (qty * price).toFixed(2)
        return next
      })
    )

  const removeItem = (i: number) =>
    setItems((its) => its.filter((_, idx) => idx !== i))
  const addItem = () =>
    setItems((its) => [
      ...its,
      {
        weight: "",
        origin: "",
        hscode: "",
        priceByUnit: "",
        quantity: "",
        overallPrice: "",
        unit: "",
        description: "",
      },
    ])

  /* -------------------- submit -------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!partial) return
    setIsLoading(true)
    try {
      const fd = new FormData()
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v))
      fd.append("paymentResponsibility", paymentResponsibility)
      fd.append("packages", JSON.stringify(packages))
      fd.append("items", JSON.stringify(items))

      const resp = await fetch(
        `/api/shipments/${shipmentId}/partial-shipments/${partial.id}/edit`,
        { method: "PUT", body: fd }
      )
      if (!resp.ok) throw new Error("Update failed")

      toast({ title: "Saved", description: "Partial shipment updated." })
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  /* -------------------- derived -------------------- */
  const customerName =
    customers.find((c) => c.id === partial?.customerId)?.name ?? ""

  /* -------------------- render -------------------- */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Partial Shipment&nbsp;#{partial?.id ?? "—"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-4">
          {/* ---------------- GENERAL ---------------- */}
          <Card>
            <CardHeader>
              <CardTitle>General Info</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Input id="customer" value={customerName} disabled />
              </div>

              <div>
                <Label htmlFor="receiverName">Receiver Name</Label>
                <Input
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, receiverName: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="receiverPhone">Receiver Phone</Label>
                <Input
                  id="receiverPhone"
                  value={formData.receiverPhone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, receiverPhone: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="receiverAddress">Receiver Address</Label>
                <Input
                  id="receiverAddress"
                  value={formData.receiverAddress}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      receiverAddress: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* ---------------- PACKAGES ---------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {packages.map((pkg, idx) => (
                <Card key={`pkg-${idx}`}>
                  <CardHeader>
                    <CardTitle>Package {idx + 1}</CardTitle>
                  </CardHeader>

                  <CardContent className="grid md:grid-cols-3 gap-4">
                    {(
                      [
                        ["Length", "length"],
                        ["Width", "width"],
                        ["Height", "height"],
                        ["Weight", "weight"],
                        ["Units", "units"],
                      ] as const
                    ).map(([label, field]) => (
                      <div key={field}>
                        <Label htmlFor={`${field}-${idx}`}>{label}</Label>
                        <Input
                          id={`${field}-${idx}`}
                          value={
                            (pkg[field] as string | number | undefined) ?? ""
                          }
                          onChange={(e) =>
                            updatePackage(
                              idx,
                              field,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}

                    {/* description */}
                    <div className="md:col-span-3">
                      <Label htmlFor={`pkg-desc-${idx}`}>Description</Label>
                      <Input
                        id={`pkg-desc-${idx}`}
                        value={pkg.description}
                        onChange={(e) =>
                          updatePackage(idx, "description", e.target.value)
                        }
                      />
                    </div>

                    {/* type */}
                    <div>
                      <Label htmlFor={`pkg-type-${idx}`}>Type</Label>
                      <Select
                        value={pkg.typeOfPackage}
                        onValueChange={(v) =>
                          updatePackage(idx, "typeOfPackage", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "package",
                            "cartoon",
                            "piece",
                            "bag",
                            "pallet",
                            "other",
                          ].map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* cost type */}
                    <div>
                      <Label htmlFor={`pkg-costType-${idx}`}>Cost Type</Label>
                      <Select
                        value={pkg.costType}
                        onValueChange={(v) =>
                          updatePackage(idx, "costType", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["CPM", "KG", "Piece"].map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* total */}
                    <div>
                      <Label htmlFor={`pkg-total-${idx}`}>Total Cost</Label>
                      <Input
                        id={`pkg-total-${idx}`}
                        value={pkg.totalCost}
                        onChange={(e) =>
                          updatePackage(idx, "totalCost", e.target.value)
                        }
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removePackage(idx)}
                    >
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              <CardFooter className="justify-end">
                <Button type="button" variant="outline" onClick={addPackage}>
                  Add Package
                </Button>
              </CardFooter>
            </CardContent>
          </Card>

          {/* ---------------- ITEMS ---------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((it, idx) => (
                <Card key={`item-${idx}`}>
                  <CardHeader>
                    <CardTitle>Item {idx + 1}</CardTitle>
                  </CardHeader>

                  <CardContent className="grid md:grid-cols-3 gap-4">
                    {(
                      [
                        ["Weight", "weight"],
                        ["Origin", "origin"],
                        ["HS Code", "hscode"],
                        ["Price / Unit", "priceByUnit"],
                        ["Quantity", "quantity"],
                      ] as const
                    ).map(([label, field]) => (
                      <div key={field}>
                        <Label htmlFor={`item-${field}-${idx}`}>{label}</Label>
                        <Input
                          id={`item-${field}-${idx}`}
                          value={
                            (it[field] as string | number | undefined) ?? ""
                          }
                          onChange={(e) =>
                            updateItem(
                              idx,
                              field,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}

                    <div>
                      <Label htmlFor={`item-overall-${idx}`}>
                        Overall Price
                      </Label>
                      <Input
                        id={`item-overall-${idx}`}
                        value={it.overallPrice}
                        disabled
                      />
                    </div>

                    {/* unit */}
                    <div>
                      <Label htmlFor={`item-unit-${idx}`}>Unit</Label>
                      <Select
                        value={it.unit}
                        onValueChange={(v) => updateItem(idx, "unit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "package",
                            "kg",
                            "lb",
                            "piece",
                            "box",
                            "carton",
                            "other",
                          ].map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* description */}
                    <div className="md:col-span-2">
                      <Label htmlFor={`item-desc-${idx}`}>Description</Label>
                      <Input
                        id={`item-desc-${idx}`}
                        value={it.description}
                        onChange={(e) =>
                          updateItem(idx, "description", e.target.value)
                        }
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeItem(idx)}
                    >
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              <CardFooter className="justify-end">
                <Button type="button" variant="outline" onClick={addItem}>
                  Add Item
                </Button>
              </CardFooter>
            </CardContent>
          </Card>

          {/* ---------------- PAYMENT ---------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cost">Total Cost</Label>
                <Input
                  id="cost"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, cost: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  value={formData.amountPaid}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, amountPaid: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="paymentStatus">Status</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, paymentStatus: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ["paid", "Paid"],
                      ["unpaid", "Unpaid"],
                      ["partially_paid", "Partially Paid"],
                    ].map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentStatus !== "paid" && (
                <div>
                  <Label htmlFor="responsibility">Responsibility</Label>
                  <Select
                    value={paymentResponsibility}
                    onValueChange={(v) =>
                      setPaymentResponsibility(
                        v as "customer" | "receiver"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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

          {/* ---------------- ACTIONS ---------------- */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
