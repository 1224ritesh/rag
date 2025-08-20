// app/api/clear-session/route.js
import { NextResponse } from "next/server";
import { clearUserCollection } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { sessionId } = await req.json();

    console.log(`[CLEAR SESSION] Clearing session: ${sessionId}`);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Clear the user's collection
    const success = await clearUserCollection(sessionId);

    if (success) {
      return NextResponse.json({
        message: "Session cleared successfully",
        sessionId: sessionId,
        cleared: true,
      });
    } else {
      return NextResponse.json({
        message: "No documents found for this session",
        sessionId: sessionId,
        cleared: false,
      });
    }
  } catch (error) {
    console.error("[CLEAR SESSION] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear session", details: error.message },
      { status: 500 }
    );
  }
}
