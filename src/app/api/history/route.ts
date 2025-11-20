import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.historyLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100, // Limit to last 100 logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching history:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch history",
        details: errorMessage,
        hint: "If using SQLite, switch to PostgreSQL for Vercel deployment",
      },
      { status: 500 }
    );
  }
}
