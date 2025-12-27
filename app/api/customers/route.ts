import { NextResponse } from "next/server";
import { saveFileLocally } from "@/lib/upload";
import { createNote, getNoteById, listCustomers } from "@/lib/db";
import { nextId, putItem, tableName } from "@/lib/dynamodb";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const customers = await listCustomers();
    const withNotes = await Promise.all(
      customers.map(async (customer) => {
        const note = customer.noteId ? await getNoteById(customer.noteId) : null;
        return { ...customer, note };
      })
    );

    withNotes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return NextResponse.json(withNotes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString() || "";
    const phone = formData.get("phone")?.toString() || "";
    const address = formData.get("address")?.toString() || "";
    const origin = formData.get("origin")?.toString() || "";
    const noteContent = formData.get("noteContent")?.toString() || "";

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const imageFiles = formData.getAll("images") as File[];
    const imagePaths: string[] = [];

    for (const file of imageFiles) {
      if (file && file.name) {
        const fileUrl = await saveFileLocally(file, `customer/${phone}/`);
        imagePaths.push(fileUrl);
      }
    }

    const userId = await getUserIdFromCookies();

    let note = null;
    let noteId;
    if (noteContent || imagePaths.length > 0) {
      note = await createNote({
        content: noteContent || undefined,
        images: imagePaths.length ? imagePaths : undefined,
        userId: userId || undefined,
      });
      noteId = note.id;
    }

    const customerId = await nextId("customers");
    const customer = {
      id: customerId,
      name,
      phone,
      address,
      origin,
      balance: 0,
      noteId,
      ...(userId ? { createdByUserId: userId, updatedByUserId: userId } : {}),
    };

    await putItem(tableName("customers"), customer);

    return NextResponse.json({ ...customer, note }, { status: 201 });
  } catch (error: any) {
    console.log("Error creating customer:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
