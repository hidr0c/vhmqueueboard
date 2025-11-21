import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(request: Request) {
  try {
    // Rate limiting: 30 requests per minute for history
    const ip = getClientIp(request);
    const { success, remaining, resetTime } = rateLimit(
      `history-${ip}`,
      30,
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

    const logs = await prisma.historyLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100, // Limit to last 100 logs
    });

    return NextResponse.json(logs, {
      headers: {
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(resetTime).toISOString(),
      },
    });
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
