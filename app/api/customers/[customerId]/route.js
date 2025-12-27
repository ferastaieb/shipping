// app/api/customers/[customerId]/route.js
import { NextResponse } from "next/server";
import { saveFileLocally } from "@/lib/upload";
import {
  createNote,
  getCustomerById,
  getCustomerWithDetails,
  getNoteById,
  getPartialShipmentsByCustomerId,
  updateNote,
} from "@/lib/db";
import { deleteItem, incrementItem, tableName, updateItem } from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

export async function PATCH(request, context) {
  const { params } = await context;
  const customerId = Number(params.customerId);

  try {
    const existingCustomer = await getCustomerById(customerId);
    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const userId = await getUserIdFromCookies();

    const balanceIncrementStr = formData.get("balanceIncrement")?.toString();
    if (balanceIncrementStr) {
      const balanceIncrement = Number(balanceIncrementStr);
      if (!isNaN(balanceIncrement) && balanceIncrement !== 0) {
        await incrementItem(tableName("customers"), { id: customerId }, { balance: balanceIncrement });
      }
    }

    const updates = {};
    const name = formData.get("name")?.toString();
    if (name) updates.name = name;
    const phone = formData.get("phone")?.toString();
    if (phone) updates.phone = phone;
    const address = formData.get("address")?.toString();
    if (address) updates.address = address;

    if (Object.keys(updates).length) {
      await updateItem(tableName("customers"), { id: customerId }, {
        ...updates,
        ...(userId ? { updatedByUserId: userId } : {}),
      });
    }

    const noteContent = formData.get("noteContent")?.toString() || "";
    const imageFiles = formData.getAll("images");
    const imagePaths = [];

    for (const file of imageFiles) {
      if (file && file.name) {
        const fileUrl = await saveFileLocally(file, `customer/${phone || ""}/`);
        imagePaths.push(fileUrl);
      }
    }

    if (noteContent || imagePaths.length > 0) {
      if (existingCustomer.noteId) {
        await updateNote(existingCustomer.noteId, {
          content: noteContent,
          images: imagePaths,
        }, userId);
      } else {
        const newNote = await createNote({
          content: noteContent,
          images: imagePaths,
          userId: userId || undefined,
        });
        await updateItem(tableName("customers"), { id: customerId }, {
          noteId: newNote.id,
          ...(userId ? { updatedByUserId: userId } : {}),
        });
      }
    }

    const updatedCustomer = await getCustomerById(customerId);
    const note = updatedCustomer?.noteId ? await getNoteById(updatedCustomer.noteId) : null;

    return NextResponse.json({ ...updatedCustomer, note });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(_request, { params }) {
  const { customerId } = params;
  try {
    const customer = await getCustomerWithDetails(Number(customerId));
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (error) {
    console.log("e", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { customerId } = params;
  try {
    const partials = await getPartialShipmentsByCustomerId(Number(customerId));
    if (partials.length) {
      return NextResponse.json(
        { error: "Cannot delete customer with partial shipments." },
        { status: 400 }
      );
    }

    await deleteItem(tableName("customers"), { id: Number(customerId) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
