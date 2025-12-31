"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"

type ShipmentItem = {
  id: number
  partialShipmentId?: number
  weight?: number
  origin?: string
  hscode?: string
  amount?: number
  value?: number
  priceByUnit?: number
  description?: string
  quantity?: number
  unit?: string
}

const normalize = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).toLowerCase()

const formatNumber = (value: number | undefined, digits = 2) =>
  Number.isFinite(value) ? value!.toFixed(digits) : "N/A"

export default function ItemsPage() {
  const [items, setItems] = useState<ShipmentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/items`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
      if (!response.ok) throw new Error("Failed to fetch items")
      setItems(await response.json())
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return items
    const matches = (value: unknown) => normalize(value).includes(term)
    return items.filter((item) =>
      [
        item.id,
        item.partialShipmentId,
        item.description,
        item.origin,
        item.hscode,
        item.unit,
        item.quantity,
        item.weight,
        item.value,
        item.priceByUnit,
        item.amount,
      ].some(matches),
    )
  }, [items, searchTerm])

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Items</h1>
        <Card className="bg-white shadow-lg border-l-4 border-[#1ABC9C]">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-2xl font-bold text-[#2C3E50]">All Items</CardTitle>
            <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search description, origin, HS code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={fetchItems}
                className="border-[#1ABC9C] text-[#1ABC9C] hover:bg-[#E8F8F5]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No items found.</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No items match your search.</div>
            ) : (
              <>
                <div className="text-sm text-gray-500 mb-3">
                  Showing {filteredItems.length} of {items.length} items
                </div>
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-[#2C3E50] w-16">ID</TableHead>
                      <TableHead className="text-[#2C3E50] w-32">Partial ID</TableHead>
                      <TableHead className="text-[#2C3E50]">Description</TableHead>
                      <TableHead className="text-[#2C3E50]">Origin</TableHead>
                      <TableHead className="text-[#2C3E50]">HS Code</TableHead>
                      <TableHead className="text-[#2C3E50]">Unit</TableHead>
                      <TableHead className="text-[#2C3E50]">Qty</TableHead>
                      <TableHead className="text-[#2C3E50]">Weight</TableHead>
                      <TableHead className="text-[#2C3E50]">Value</TableHead>
                      <TableHead className="text-[#2C3E50]">Price/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, index) => {
                      const value =
                        Number.isFinite(item.value) && item.value !== undefined
                          ? item.value
                          : Number.isFinite(item.priceByUnit) && Number.isFinite(item.quantity)
                            ? (item.priceByUnit || 0) * (item.quantity || 0)
                            : undefined

                      return (
                        <TableRow
                          key={item.id}
                          className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.partialShipmentId ?? "N/A"}</TableCell>
                          <TableCell className="max-w-[260px] truncate">
                            {item.description || "N/A"}
                          </TableCell>
                          <TableCell>{item.origin || "N/A"}</TableCell>
                          <TableCell>{item.hscode || "N/A"}</TableCell>
                          <TableCell>{item.unit || "N/A"}</TableCell>
                          <TableCell>{formatNumber(item.quantity, 2)}</TableCell>
                          <TableCell>{formatNumber(item.weight, 2)}</TableCell>
                          <TableCell>{formatNumber(value, 2)}</TableCell>
                          <TableCell>{formatNumber(item.priceByUnit, 2)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
