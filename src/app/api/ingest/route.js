// app/api/ingest/route.js
import { NextResponse } from "next/server";
import { loadDocuments } from "@/lib/loaders";
import { upsertDocuments } from "@/lib/qdrant";
import { Document } from "@langchain/core/documents";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type");

    // Handle text content
    if (contentType?.includes("application/json")) {
      const { textContent, filename } = await req.json();

      if (!textContent || !textContent.trim()) {
        return NextResponse.json(
          { error: "Text content is required" },
          { status: 400 }
        );
      }

      // Create document from text content
      const document = new Document({
        pageContent: textContent.trim(),
        metadata: {
          source: filename || `text_${Date.now()}.txt`,
          type: "text_input",
          timestamp: new Date().toISOString(),
        },
      });

      // Load and split the document
      const docs = await loadDocuments(
        Buffer.from(textContent, "utf-8"),
        filename || "text_input.txt",
        true
      );

      // Upsert documents to vector store
      await upsertDocuments(docs);

      return NextResponse.json({
        message: "Text content processed successfully",
        documentsProcessed: 1,
        totalChunks: docs.length,
      });
    }

    // Handle file uploads
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    let allDocuments = [];
    let processedCount = 0;
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(
            `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(
              1
            )}MB). Maximum size is 5MB.`
          );
          continue;
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Load and split documents
        const docs = await loadDocuments(buffer, file.name);
        allDocuments.push(...docs);
        processedCount++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`Failed to process ${file.name}: ${error.message}`);
      }
    }

    if (allDocuments.length === 0) {
      return NextResponse.json(
        {
          error: "No documents could be processed successfully",
          details: errors,
        },
        { status: 400 }
      );
    }

    // Upsert documents to vector store
    await upsertDocuments(allDocuments);

    const response = {
      message: "Documents processed successfully",
      documentsProcessed: processedCount,
      totalChunks: allDocuments.length,
    };

    if (errors.length > 0) {
      response.warnings = errors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Ingest API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
