// app/api/shipments/route.js
import { NextResponse } from 'next/server'
import { saveFileLocally } from '@/lib/upload'
import { createNote, listShipments } from '@/lib/db'
import { nextId, putItem, tableName } from '@/lib/dynamodb'
import { getUserIdFromCookies } from '@/lib/auth'

// GET all shipments, optionally filter by status=open|closed and destination
// Add cache headers to prevent frequent requests
export async function GET(request) {
  // Parse the URL to get query parameters
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  try {
    // Filter by status if provided
    const whereClause = status === "open" ? { isOpen: true } : status === "closed" ? { isOpen: false } : {}

    const shipments = await listShipments()
    const filtered = whereClause.isOpen === undefined
      ? shipments
      : shipments.filter((s) => s.isOpen === whereClause.isOpen)

    const responseData = filtered
      .sort((a, b) => b.id - a.id)
      .map((s) => ({
        id: s.id,
        destination: s.destination,
        dateCreated: s.dateCreated,
        totalWeight: s.totalWeight,
        totalVolume: s.totalVolume,
        driverVehicle: s.driverVehicle,
        driverName: s.driverName,
        isOpen: s.isOpen,
      }))

    // Set cache headers to prevent frequent requests
    return new NextResponse(JSON.stringify(responseData), {
      headers: {
        "Content-Type": "application/json",
        // Cache for 5 minutes
        "Cache-Control": "max-age=300, s-maxage=300",
      },
    })
  } catch (error) {
    console.error("Error fetching shipments:", error)
    return new NextResponse(JSON.stringify({ error: "Failed to fetch shipments" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

// POST a new shipment with optional note and image uploads
export async function POST(request) {
  try {
    // 1. Parse the incoming form data
    const formData = await request.formData()

    // 2. Extract text fields
    const destination = formData.get('destination')?.toString() || ''
    const noteContent = formData.get('noteContent')?.toString() || ''

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required.' }, { status: 400 })
    }

    // 3. Handle file uploads from the "images" field (for note images)
    const imageFiles = formData.getAll('images') // returns an array of FormData entries (File objects)
    const imagePaths = []

    for (const file of imageFiles) {
      if (file && file.name) {
        // Save each file locally under a folder named `shipment/<destination>/`
        const fileUrl = await saveFileLocally(file, `shipment/${destination}`)
        imagePaths.push(fileUrl)
      }
    }

    // 4. Prepare nested note data if any note content or images are provided
    const userId = getUserIdFromCookies()
    let note = null
    let noteId
    if (noteContent || imagePaths.length > 0) {
      const created = await createNote({
        content: noteContent || undefined,
        images: imagePaths.length ? imagePaths : undefined,
        userId: userId || undefined,
      })
      note = created
      noteId = created.id
    }

    const shipmentId = await nextId('shipments')
    const now = new Date().toISOString()
    const shipment = {
      id: shipmentId,
      destination,
      dateCreated: now,
      isOpen: true,
      totalWeight: 0,
      totalVolume: 0,
      noteId,
      ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
    }

    await putItem(tableName('shipments'), shipment)

    return NextResponse.json({ ...shipment, note }, { status: 201 })
  } catch (error) {
    console.error('Error creating shipment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
