import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { triggerQueueUpdate, EVENTS } from "@/lib/pusher";

// GET all queue entries
export async function GET(request: Request) {
  try {
    // Rate limiting: 60 requests per minute for reads
    const ip = getClientIp(request);
    const { success, remaining, resetTime } = rateLimit(`get-${ip}`, 60, 60000);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": new Date(resetTime).toISOString(),
            "Retry-After": Math.ceil(
              (resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const entries = await prisma.queueEntry.findMany({
      orderBy: [{ rowIndex: "asc" }, { side: "asc" }, { position: "asc" }],
    });

    return NextResponse.json(entries, {
      headers: {
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(resetTime).toISOString(),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching entries:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch entries",
        details: errorMessage,
        hint: "If using SQLite, switch to PostgreSQL for Vercel deployment",
      },
      { status: 500 }
    );
  }
}

// POST - Initialize or create entries
export async function POST(request: Request) {
  try {
    // Rate limiting: 10 requests per minute for writes
    const ip = getClientIp(request);
    const { success, remaining, resetTime } = rateLimit(
      `post-${ip}`,
      10,
      60000
    );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": new Date(resetTime).toISOString(),
            "Retry-After": Math.ceil(
              (resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

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

      // Trigger Pusher event for initialization
      await triggerQueueUpdate(EVENTS.SYNC_ALL, { entries: allEntries });

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
