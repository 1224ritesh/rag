// lib/loaders.js
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";

export async function loadDocuments(buffer, filename, isTextInput = false) {
  let documents = [];

  try {
    if (isTextInput) {
      // Handle direct text input
      const text = buffer.toString("utf-8");
      documents = [
        new Document({
          pageContent: text,
          metadata: {
            source: filename,
            type: "text_input",
            timestamp: new Date().toISOString(),
          },
        }),
      ];
    } else if (filename.toLowerCase().endsWith(".pdf")) {
      // Handle PDF files
      const blob = new Blob([buffer], { type: "application/pdf" });
      const loader = new PDFLoader(blob);
      documents = await loader.load();
    } else {
      // Handle text files (txt, md, etc.)
      const text = buffer.toString("utf-8");
      documents = [
        new Document({
          pageContent: text,
          metadata: {
            source: filename,
            type: "file_upload",
            timestamp: new Date().toISOString(),
          },
        }),
      ];
    }

    // Add filename to metadata if not already present
    documents = documents.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: doc.metadata.source || filename,
        originalFilename: filename,
      },
    }));

    // Split documents into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });

    const splitDocs = await textSplitter.splitDocuments(documents);

    // Add chunk information to metadata
    return splitDocs.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        chunkIndex: index,
        totalChunks: splitDocs.length,
      },
    }));
  } catch (error) {
    console.error(`Error loading document ${filename}:`, error);
    throw error;
  }
}

export async function loadFromUrl(url) {
  const CheerioWebBaseLoader = (
    await import("@langchain/community/document_loaders/web/cheerio")
  ).CheerioWebBaseLoader;
  const loader = new CheerioWebBaseLoader(url);
  const docs = await loader.load();
  return docs;
}

export function chunkDocuments(docs, chunkSize = 1000, overlap = 200) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: overlap,
  });
  return splitter.splitDocuments(docs);
}
