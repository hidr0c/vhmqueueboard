import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all queue entries
export async function GET() {
  try {
    const entries = await prisma.queueEntry.findMany({
      orderBy: [{ rowIndex: "asc" }, { side: "asc" }, { position: "asc" }],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}

// POST - Initialize or create entries
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Initialize all entries if requested
    if (body.action === "initialize") {
      const entries = [];

      for (let row = 0; row < 12; row++) {
        for (const side of ["left", "right"]) {
          for (const position of ["P1", "P2"]) {
            entries.push({
              rowIndex: row,
              side,
              position,
              text: "",
              checked: false,
            });
          }
        }
      }

      // Use upsert to avoid duplicates
      await Promise.all(
        entries.map((entry) =>
          prisma.queueEntry.upsert({
            where: {
              rowIndex_side_position: {
                rowIndex: entry.rowIndex,
                side: entry.side,
                position: entry.position,
              },
            },
            update: {},
            create: entry,
          })
        )
      );

      const allEntries = await prisma.queueEntry.findMany({
        orderBy: [{ rowIndex: "asc" }, { side: "asc" }, { position: "asc" }],
      });

      return NextResponse.json(allEntries);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
