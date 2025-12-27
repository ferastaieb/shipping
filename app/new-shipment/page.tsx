"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Loader2, X, MapPin, FileText, Camera } from "lucide-react"
import ProtectedRoute from "@/components/ProtectedRoute"
import Image from "next/image"

export default function NewShipmentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDestinationSelect = (destination: string) => {
    setSelectedDestination(destination)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDestination) {
      toast({
        title: "Error",
        description: "Please select a destination.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("destination", selectedDestination)
      formData.append("noteContent", noteContent)

      selectedFiles.forEach((file) => {
        formData.append("images", file)
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create Batch")
      }

      const newShipment = await response.json()
      toast({
        title: "Success",
        description: `New Batch to ${newShipment.destination} created successfully.`,
      })
      router.push("/")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-white">New Batch</h1>
        <form onSubmit={handleSubmit}>
          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#1ABC9C]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#2C3E50]">
                <MapPin className="mr-2 h-5 w-5 text-[#1ABC9C]" />
                Select Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                className={`flex-1 h-24 text-lg transition-colors ${
                  selectedDestination === "Syria"
                    ? "bg-[#1ABC9C] text-white"
                    : "bg-white text-[#2C3E50] border-2 border-[#1ABC9C] hover:bg-[#1ABC9C] hover:text-white"
                }`}
                onClick={() => handleDestinationSelect("Syria")}
              >
                Syria
              </Button>
              <Button
                type="button"
                className={`flex-1 h-24 text-lg transition-colors ${
                  selectedDestination === "Saudi Arabia"
                    ? "bg-[#1ABC9C] text-white"
                    : "bg-white text-[#2C3E50] border-2 border-[#1ABC9C] hover:bg-[#1ABC9C] hover:text-white"
                }`}
                onClick={() => handleDestinationSelect("Saudi Arabia")}
              >
                Saudi Arabia
              </Button>
                            <Button
                type="button"
                className={`flex-1 h-24 text-lg transition-colors ${
                  selectedDestination === "UAE"
                    ? "bg-[#1ABC9C] text-white"
                    : "bg-white text-[#2C3E50] border-2 border-[#1ABC9C] hover:bg-[#1ABC9C] hover:text-white"
                }`}
                onClick={() => handleDestinationSelect("UAE")}
              >
                UAE
              </Button>
            </CardContent>
            
          </Card>

          <Card className="mb-6 bg-white shadow-lg border-l-4 border-[#3498DB]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#2C3E50]">
                <FileText className="mr-2 h-5 w-5 text-[#3498DB]" />
                Batch Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="noteContent" className="text-[#2C3E50]">
                  Note
                </Label>
                <Textarea
                  id="noteContent"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter any additional notes here..."
                  className="mt-1 border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
                />
              </div>
              <div>
                <Label htmlFor="images" className="text-[#2C3E50] flex items-center">
                  <Camera className="mr-2 h-5 w-5 text-[#3498DB]" />
                  Photos
                </Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="mt-1 border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={file ? URL.createObjectURL(file) : "/placeholder.svg"}
                        alt={`Selected ${index + 1}`}
                        width={80}
                        height={80}
                        unoptimized
                        className="object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full bg-[#1ABC9C] hover:bg-[#16A085] text-white transition-colors"
            disabled={isLoading || !selectedDestination}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Batch...
              </>
            ) : (
              "Start Batch"
            )}
          </Button>
        </form>
      </div>
    </ProtectedRoute>
  )
}

