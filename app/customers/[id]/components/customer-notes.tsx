"use client"

import Image from "next/legacy/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, ImageIcon } from "lucide-react"

interface Customer {
  id: number
  name: string
  phone: string
  address: string
  note?: {
    content: string
    images: string[]
  }
}

export default function CustomerNotes({ customer }: { customer: Customer }) {
  if (!customer.note) {
    return <p className="text-gray-500 italic">No notes available for this customer.</p>
  }
  const baseUrl = "https://147.93.58.160:10000/updown/fetch.cgi/var/www/shipping"

  const handleDownload = (imageUrl: string) => {
    window.open(imageUrl, "_blank")
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-[#2C3E50] flex items-center">
          <FileText className="w-5 h-5 mr-2 text-[#3498DB]" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-[#2C3E50]">Content:</h3>
            <p className="text-gray-700">{customer.note.content}</p>
          </div>
          {customer.note.images && customer.note.images.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-[#2C3E50] flex items-center">
                <ImageIcon className="w-5 h-5 mr-2 text-[#3498DB]" />
                Images:
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {customer.note.images.map((image, index) => {
                  const imageUrl = image ? `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}` : "/placeholder.svg"

                  return (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={imageUrl || "/placeholder.svg"}
                        alt={`Customer note image ${index + 1}`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2 bg-[#3498DB] text-white hover:bg-[#2980B9]"
                        onClick={() => handleDownload(imageUrl)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

