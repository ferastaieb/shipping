// app/api/shipments/[shipmentId]/route.js
import { NextResponse } from 'next/server'
import { getShipmentWithDetails, getShipmentById, getPartialShipmentsByShipmentId } from '@/lib/db'
import { deleteItem, tableName, updateItem } from '@/lib/dynamodb'
import { getUserIdFromCookies } from '@/lib/auth'

export async function GET(request, { params }) {
  const { shipmentId } = await params
  // console.log('GET request received with shipmentId:', shipmentId)

  try {
    const shipment = await getShipmentWithDetails(Number(shipmentId))
    
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }
    // console.log('h', shipment)
    return NextResponse.json(shipment)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const { shipmentId } = params
  try {
    const body = await request.json()
    // body could include: isOpen, driverName, driverVehicle, dateClosed, etc.

    const userId = await getUserIdFromCookies()
    const updatedShipment = await updateItem(
      tableName('shipments'),
      { id: Number(shipmentId) },
      {
        ...body,
        ...(userId ? { updatedByUserId: userId } : {}),
      }
    )
    return NextResponse.json(updatedShipment)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { shipmentId } = params
  try {
    const shipment = await getShipmentById(Number(shipmentId))
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    const partials = await getPartialShipmentsByShipmentId(Number(shipmentId))
    if (partials.length) {
      return NextResponse.json(
        { error: 'Cannot delete shipment with partial shipments.' },
        { status: 400 }
      )
    }

    await deleteItem(tableName('shipments'), { id: Number(shipmentId) })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
