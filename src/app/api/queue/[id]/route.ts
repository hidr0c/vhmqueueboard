import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, checked } = body;

    const entryId = parseInt(id);

    // Get current entry
    const currentEntry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!currentEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Update entry
    const updatedEntry = await prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        ...(text !== undefined && { text }),
        ...(checked !== undefined && { checked }),
        updatedAt: new Date(),
      },
    });

    // Log the change
    if (checked !== undefined && checked !== currentEntry.checked) {
      await prisma.historyLog.create({
        data: {
          rowIndex: currentEntry.rowIndex,
          side: currentEntry.side,
          position: currentEntry.position,
          action: checked ? "checked" : "unchecked",
          oldValue: String(currentEntry.checked),
          newValue: String(checked),
        },
      });
    }

    if (text !== undefined && text !== currentEntry.text) {
      await prisma.historyLog.create({
        data: {
          rowIndex: currentEntry.rowIndex,
          side: currentEntry.side,
          position: currentEntry.position,
          action: "text_changed",
          oldValue: currentEntry.text,
          newValue: text,
        },
      });
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = parseInt(id);

    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Clear the text instead of deleting
    const updatedEntry = await prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        text: "",
        updatedAt: new Date(),
      },
    });

    // Log the deletion
    await prisma.historyLog.create({
      data: {
        rowIndex: entry.rowIndex,
        side: entry.side,
        position: entry.position,
        action: "text_changed",
        oldValue: entry.text,
        newValue: "",
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
