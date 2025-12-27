"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, Clock, Package, User } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type OpenShipment = {
  id: number
  destination: string
  dateCreated: string
  totalWeight: number
  totalVolume: number
}

// Update the Activity type to match the new API response (no timestamp)
type Activity = {
  model: string
  action: "create" | "update"
  recordId: number
  user: { id: number; username: string }
}

// Replace the ActivityResponse type with the new API response format
type ActivityResponse = {
  data: Activity[]
}

export default function OpenShipmentsWithActivities() {
  // Shipments state
  const [shipments, setShipments] = useState<OpenShipment[]>([])
  const [isLoadingShipments, setIsLoadingShipments] = useState(true)
  const [shipmentError, setShipmentError] = useState<string | null>(null)

  // Update the activities state and remove pagination-related states
  const [activities, setActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoadingActivities, setIsLoadingActivities] = useState(true)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState("shipments")

  // Fetch shipments
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    async function fetchOpenShipments() {
      try {
        setIsLoadingShipments(true)

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments?status=open`, {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (!response.ok) throw new Error("Failed to fetch open shipments")

        const data = await response.json()

        if (isMounted) {
          setShipments(data)
          setIsLoadingShipments(false)
        }
      } catch (err: any) {
        if (isMounted && err.name !== "AbortError") {
          console.error("Error fetching open shipments:", err)
          setShipmentError(err.message)
          setIsLoadingShipments(false)
        }
      }
    }

    fetchOpenShipments()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  // Replace the activities fetch effect with this one
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    async function fetchUserActivities() {
      try {
        setIsLoadingActivities(true)

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-activities`, {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (!response.ok) throw new Error("Failed to fetch user activities")

        const data: ActivityResponse = await response.json()

        if (isMounted) {
          setActivities(data.data)
          setFilteredActivities(data.data)
          setIsLoadingActivities(false)
        }
      } catch (err: any) {
        if (isMounted && err.name !== "AbortError") {
          console.error("Error fetching user activities:", err)
          setActivitiesError(err.message)
          setIsLoadingActivities(false)
        }
      }
    }

    if (activeTab === "activities") {
      fetchUserActivities()
    }

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [activeTab])

  // Add a search effect
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredActivities(activities)
      return
    }

    const lowerCaseSearch = searchTerm.toLowerCase()
    const filtered = activities.filter(activity => 
      activity.model.toLowerCase().includes(lowerCaseSearch) ||
      activity.action.toLowerCase().includes(lowerCaseSearch) ||
      activity.recordId.toString().includes(lowerCaseSearch) ||
      activity.user.username.toLowerCase().includes(lowerCaseSearch)
    )
    
    setFilteredActivities(filtered)
  }, [searchTerm, activities])

  // Add a search input handler
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Get model badge color
  const getModelBadgeColor = (model: string) => {
    const colors: Record<string, string> = {
      Shipment: "bg-blue-100 text-blue-800",
      PartialShipment: "bg-green-100 text-green-800",
      PackageDetail: "bg-purple-100 text-purple-800",
      PartialShipmentItem: "bg-amber-100 text-amber-800",
      Customer: "bg-rose-100 text-rose-800",
    }
    return colors[model] || "bg-gray-100 text-gray-800"
  }

  // Get action badge color
  const getActionBadgeColor = (action: "create" | "update") => {
    return action === "create" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="shipments" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shipments">Open Shipments</TabsTrigger>
          <TabsTrigger value="activities">User Activities</TabsTrigger>
        </TabsList>

        {/* Shipments Tab */}
        <TabsContent value="shipments" className="mt-4">
          {isLoadingShipments ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : shipmentError ? (
            <div className="text-red-500 p-4">Error: {shipmentError}</div>
          ) : shipments.length === 0 ? (
            <div className="text-center p-4">No open shipments found.</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-1">
              <div className="space-y-3">
                {shipments.map((shipment) => (
                  <Link
                    href={`/shipments/${shipment.id}`}
                    key={shipment.id}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Batch #{shipment.id}</p>
                        <p className="text-sm text-gray-500">To {shipment.destination}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{new Date(shipment.dateCreated).toLocaleDateString()}</p>
                        <p className="text-gray-500">{shipment.totalWeight.toFixed(2)} kg</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {shipments.length > 5 && (
                <div className="text-center text-sm text-blue-600 mt-4">
                  <Link href="/shipments">View all {shipments.length} open shipments</Link>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Replace the Activities Tab content with this updated version */}
        <TabsContent value="activities" className="mt-4">
          {isLoadingActivities ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activitiesError ? (
            <div className="text-red-500 p-4">Error: {activitiesError}</div>
          ) : (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {filteredActivities.length === 0 ? (
                <div className="text-center p-4">
                  {activities.length === 0 ? "No activities found." : "No matching activities found."}
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {filteredActivities.map((activity, index) => (
                      <div
                        key={`${activity.model}-${activity.recordId}-${activity.action}-${index}`}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {activity.action === "create" ? (
                                <Package className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-orange-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${getActionBadgeColor(activity.action)}`}
                                >
                                  {activity.action === "create" ? "Created" : "Updated"}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${getModelBadgeColor(activity.model)}`}
                                >
                                  {activity.model}
                                </span>
                              </div>
                              <p className="text-sm font-medium">ID: {activity.recordId}</p>
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <User className="h-3 w-3 mr-1" />
                                <span>{activity.user.username}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}