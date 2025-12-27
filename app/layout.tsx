// app/layout.tsx (or layout.jsx)

import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/toaster"
import type React from "react"
import { AuthProvider } from "@/context/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ShipMaster – Shipping Management Dashboard",
  description: "Simple Shipping Management Application",
  icons: {
    // this will be your favicon in the browser tab:
    icon: [
      { url: "/box-icon.svg", type: "image/svg+xml" },
    ],    // and this will be used e.g. on iOS home screen if someone saves your PWA:
    apple: "/box-icon.svg",
    // you can also add a shortcut:
    shortcut: "/box-icon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <html lang="en" className={inter.className}>
        <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        </head>
        <body className="bg-gradient-to-br from-[#2C3E50] to-[#34495E] min-h-screen">
          <div className="flex h-full min-h-screen">
            <Sidebar />
            <main className="flex-1 md:pl-72 pb-10 overflow-auto">
              <div className="h-full min-h-screen">{children}</div>
            </main>
          </div>
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  )
}
