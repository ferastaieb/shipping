"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, Users, Truck, PlusCircle, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const routes = [
  {
    label: "Dashboard",
    icon: Home,
    href: "/",
  },
  {
    label: "New Batch",
    icon: PlusCircle,
    href: "/new-shipment",
  },
  {
    label: "Closed Batches",
    icon: Truck,
    href: "/shipments/closed",
  },
  {
    label: "Customers",
    icon: Users,
    href: "/customers",
  },
  {
    label: "Items",
    icon: List,
    href: "/items",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if the user is authenticated (you may need to adjust this based on your auth strategy)
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check-auth")
        if (response.ok) {
          setIsVisible(true)
        } else {
          setIsVisible(false)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        setIsVisible(false)
      }
    }

    checkAuth()
  }, [])


  if (!isVisible) return null

  return (
    <div className="h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-[#2C3E50] text-white">
      <div className="space-y-4 py-4 flex flex-col h-full">
        <div className="px-3 py-2 flex-1">
          <Link href="/" className="flex items-center pl-3 mb-14">
            <Package className="h-8 w-8 text-[#1ABC9C]" />
            <span className="text-2xl font-bold ml-2">ShipMaster</span>
          </Link>
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition",
                  pathname === route.href ? "text-[#1ABC9C] bg-white/10" : "text-white hover:bg-white/5",
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon
                    className={cn("h-5 w-5 mr-3", pathname === route.href ? "text-[#1ABC9C]" : "text-white")}
                  />
                  {route.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
        </div>
      </div>
    </div>
  )
}

