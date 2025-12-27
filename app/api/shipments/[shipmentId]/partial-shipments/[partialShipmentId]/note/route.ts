import { NextResponse } from "next/server"
import { createNote, getPartialShipmentById, updateNote } from "@/lib/db"
import { tableName, updateItem } from "@/lib/dynamodb"
import { getUserIdFromCookies } from "@/lib/auth"

export async function PATCH(
    request: Request,
    { params } : { params: Promise<{ shipmentId: string; partialShipmentId: string }> },
) {
    const { shipmentId, partialShipmentId } = await params
    const { note } = await request.json()

    if (typeof note !== "string") {
        return NextResponse.json({ error: "Invalid note content" }, { status: 400 })
    }

    try {
        const partialShipment = await getPartialShipmentById(Number(partialShipmentId))

        if (!partialShipment || partialShipment.shipmentId !== Number(shipmentId)) {
            return NextResponse.json({ error: "Partial shipment not found" }, { status: 404 })
        }

        const userId = getUserIdFromCookies()
        if (partialShipment.noteId) {
            await updateNote(partialShipment.noteId, { content: note }, userId)
        } else {
            const newNote = await createNote({ content: note, userId: userId || undefined })
            await updateItem(
                tableName("partialShipments"),
                { id: Number(partialShipmentId) },
                { noteId: newNote.id, ...(userId ? { updatedByUserId: userId } : {}) }
            )
        }

        return NextResponse.json({ message: "Note updated successfully" })
    } catch (error: any) {
        console.error("Error updating note:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
