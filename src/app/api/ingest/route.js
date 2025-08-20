// app/api/ingest/route.js
import { NextResponse } from "next/server";
import { loadDocuments } from "@/lib/loaders";
import { upsertDocuments } from "@/lib/qdrant";
import { Document } from "@langchain/core/documents";
import {
  scrapeWebsite,
  validateUrl,
  formatScrapedContent,
} from "@/lib/webscraper";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type");

    // Handle text content or website URL
    if (contentType?.includes("application/json")) {
      const body = await req.json();
      const { textContent, filename, websiteUrl } = body;

      // Handle website URL scraping
      if (websiteUrl) {
        // Validate URL
        const validation = validateUrl(websiteUrl);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        try {
          // Scrape website content
          const scrapedData = await scrapeWebsite(validation.url);

          // Format the scraped content
          const formattedContent = formatScrapedContent(scrapedData);

          // Create document from scraped content
          const document = new Document({
            pageContent: formattedContent,
            metadata: {
              source: scrapedData.url,
              type: "website",
              title: scrapedData.title,
              domain: new URL(scrapedData.url).hostname,
              scrapedAt: scrapedData.scrapedAt,
              contentLength: scrapedData.contentLength,
              timestamp: new Date().toISOString(),
            },
          });

          // Load and split the document
          const docs = await loadDocuments(
            Buffer.from(formattedContent, "utf-8"),
            `${new URL(scrapedData.url).hostname}_${Date.now()}.md`,
            true
          );

          // Upsert documents to vector store
          await upsertDocuments(docs);

          return NextResponse.json({
            message: "Website content processed successfully",
            url: scrapedData.url,
            title: scrapedData.title,
            totalChunks: docs.length,
            contentLength: scrapedData.contentLength,
          });
        } catch (error) {
          console.error("Website scraping error:", error);
          return NextResponse.json(
            { error: `Failed to scrape website: ${error.message}` },
            { status: 400 }
          );
        }
      }

      // Handle text content
      if (textContent) {
        if (!textContent.trim()) {
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

      return NextResponse.json(
        { error: "Either textContent or websiteUrl is required" },
        { status: 400 }
      );
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
