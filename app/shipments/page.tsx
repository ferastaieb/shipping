"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import ProtectedRoute from "@/components/ProtectedRoute"

interface Shipment {
  id: number
  destination: string
  dateCreated: string
  totalWeight: number
  totalVolume: number
  driverName: string | null
  driverVehicle: string | null
}

export default function OpenShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOpenShipments()
  }, [])

  const fetchOpenShipments = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments?status=open`)
      if (!res.ok) {
        throw new Error("Failed to fetch open batches")
      }
      setShipments(await res.json())
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load open batches."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Open Batches</h1>

        {shipments.length === 0 ? (
          <p>No open batches found.</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Open Batches Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Total Weight</TableHead>
                    <TableHead>Total Volume</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>{shipment.id}</TableCell>
                      <TableCell>{shipment.destination}</TableCell>
                      <TableCell>{new Date(shipment.dateCreated).toLocaleString()}</TableCell>
                      <TableCell>{shipment.totalWeight} kg</TableCell>
                      <TableCell>{shipment.totalVolume} mA3</TableCell>
                      <TableCell>{shipment.driverName || "N/A"}</TableCell>
                      <TableCell>{shipment.driverVehicle || "N/A"}</TableCell>
                      <TableCell>
                        <Link href={`/shipments/${shipment.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
