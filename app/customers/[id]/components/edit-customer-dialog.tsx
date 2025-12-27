"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Loader2, X, User, Phone, MapPin, FileText, Camera } from "lucide-react"
import Image from "next/image"

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

export default function EditCustomerDialog({ customer, children }: { customer: Customer; children: React.ReactNode }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    noteContent: customer.note?.content || "",
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("name", formData.name)
      formDataToSend.append("phone", formData.phone)
      formDataToSend.append("address", formData.address)
      formDataToSend.append("noteContent", formData.noteContent)

      selectedFiles.forEach((file) => {
        formDataToSend.append("images", file)
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customer.id}`, {
        method: "PATCH",
        body: formDataToSend,
      })

      if (!response.ok) throw new Error("Failed to update customer")

      const updatedCustomer = await response.json()
      toast({
        title: "Success",
        description: `Customer ${updatedCustomer.name} updated successfully.`,
      })
      setIsOpen(false)
      router.refresh()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#2C3E50] flex items-center">
            <User className="w-6 h-6 mr-2 text-[#3498DB]" />
            Edit Customer
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[#2C3E50] flex items-center">
              <User className="w-4 h-4 mr-2 text-[#3498DB]" />
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-[#2C3E50] flex items-center">
              <Phone className="w-4 h-4 mr-2 text-[#3498DB]" />
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
            />
          </div>
          <div>
            <Label htmlFor="address" className="text-[#2C3E50] flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-[#3498DB]" />
              Address
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
            />
          </div>
          <div>
            <Label htmlFor="noteContent" className="text-[#2C3E50] flex items-center">
              <FileText className="w-4 h-4 mr-2 text-[#3498DB]" />
              Note
            </Label>
            <Textarea
              id="noteContent"
              name="noteContent"
              value={formData.noteContent}
              onChange={handleInputChange}
              placeholder="Add a note about this customer (optional)"
              className="border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
            />
          </div>
          <div>
            <Label htmlFor="images" className="text-[#2C3E50] flex items-center">
              <Camera className="w-4 h-4 mr-2 text-[#3498DB]" />
              Add Photos
            </Label>
            <Input
              id="images"
              name="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              className="border-2 border-[#3498DB] focus:ring-[#3498DB] focus:border-[#3498DB]"
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
          <Button
            type="submit"
            className="w-full bg-[#3498DB] hover:bg-[#2980B9] text-white transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Customer...
              </>
            ) : (
              "Update Customer"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

