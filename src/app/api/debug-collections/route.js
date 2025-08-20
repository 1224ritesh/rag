import { NextResponse } from "next/server";
import { listAllCollections, cleanupOldCollections } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const collections = await listAllCollections();
    return NextResponse.json({
      collections: collections,
      total: collections.length,
    });
  } catch (error) {
    console.error("Debug collections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await cleanupOldCollections();
    return NextResponse.json({
      message: "Cleanup completed",
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
