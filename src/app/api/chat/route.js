// app/api/chat/route.js
import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getVectorStore } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { question, sessionId, k = 4 } = await req.json();

    console.log(`[CHAT API] Processing question for session: ${sessionId}`);

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get vector store for the specific session
    console.log(`[CHAT API] Getting vector store for session: ${sessionId}`);
    const vectorStore = await getVectorStore(sessionId);

    if (!vectorStore) {
      console.log(`[CHAT API] No vector store found for session: ${sessionId}`);
      return NextResponse.json({
        answer:
          "I don't have any knowledge base for this session yet. Please upload files, add text, or provide a website URL to get started.",
        sources: [],
        debug: {
          sessionId: sessionId,
          hasVectorStore: false,
        },
      });
    }

    // Search for relevant documents in the user's collection
    console.log(`[CHAT API] Searching for relevant documents...`);
    const docs = await vectorStore.similaritySearch(question, k);

    console.log(`[CHAT API] Found ${docs.length} relevant documents`);
    console.log(
      `[CHAT API] Document sources:`,
      docs.map((d) => ({
        source: d.metadata?.source || "unknown",
        type: d.metadata?.type || "unknown",
        sessionId: d.metadata?.sessionId || "unknown",
      }))
    );

    if (docs.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find relevant information in your current session's documents. Try rephrasing the question or adding more content.",
        sources: [],
        debug: {
          sessionId: sessionId,
          hasVectorStore: true,
          documentsFound: 0,
        },
      });
    }

    // Build the context string
    const contextText = docs
      .map((d, i) => `SOURCE ${i + 1}:\n${d.pageContent}`)
      .join("\n\n---\n\n");

    // Build messages for chat model
    const messages = [
      [
        "system",
        "You are a helpful assistant. Use ONLY the provided context from the user's uploaded documents to answer questions accurately and concisely. If you cannot find the answer in the provided context, say so clearly. Always cite your sources using [1], [2], etc. Do not use any external knowledge - only answer based on the user's documents.",
      ],
      [
        "human",
        `Context from user's documents:\n${contextText}\n\nQuestion: ${question}`,
      ],
    ];

    // Initialize Gemini chat model with timeout and fallback
    const primaryModel = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";
    const fallbackModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    let chat = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: primaryModel,
      temperature: 0.0,
      maxRetries: 1,
      timeout: 30000, // 30 second timeout
    });

    // Get response from the model with timeout and error handling
    console.log(
      `[CHAT API] Getting response from Gemini using model: ${primaryModel}...`
    );
    let response;
    let lastError;

    // Try primary model first, then fallbacks
    const modelsToTry = [
      primaryModel,
      ...fallbackModels.filter((m) => m !== primaryModel),
    ];

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];

      try {
        if (i > 0) {
          console.log(`[CHAT API] Trying fallback model: ${currentModel}...`);
          chat = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            model: currentModel,
            temperature: 0.0,
            maxRetries: 1,
            timeout: 30000,
          });
        }

        response = await Promise.race([
          chat.invoke(messages),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Request timeout after 30 seconds")),
              30000
            )
          ),
        ]);

        console.log(
          `[CHAT API] Successfully got response from model: ${currentModel}`
        );
        break; // Success, exit the loop
      } catch (error) {
        lastError = error;
        console.error(
          `[CHAT API] Error with model ${currentModel}:`,
          error.message
        );

        // If this is the last model to try, handle the error
        if (i === modelsToTry.length - 1) {
          // Handle specific Google API errors
          if (error.status === 500) {
            return NextResponse.json({
              answer:
                "I'm experiencing technical difficulties with the AI service. The AI models are temporarily unavailable. Please try again in a few minutes.",
              sources: [],
              debug: {
                sessionId: sessionId,
                hasVectorStore: true,
                documentsFound: docs.length,
                error: `All models failed. Last error: ${error.message}`,
                modelsAttempted: modelsToTry,
              },
            });
          }

          if (error.message.includes("timeout")) {
            return NextResponse.json({
              answer:
                "The request took too long to process. Please try asking a simpler question or try again.",
              sources: [],
              debug: {
                sessionId: sessionId,
                hasVectorStore: true,
                documentsFound: docs.length,
                error: "Request timeout on all models",
              },
            });
          }

          throw error; // Re-throw if it's not a handled error
        }
      }
    }

    console.log(`[CHAT API] Raw response from Gemini:`, {
      content: response.content,
      contentLength: response.content?.length || 0,
      isEmpty: !response.content || response.content.trim() === "",
    });

    const result = {
      answer:
        response.content ||
        "I apologize, but I couldn't generate a response. Please try rephrasing your question.",
      sources: docs.map((d, i) => ({
        id: i + 1,
        source:
          d.metadata?.source || d.metadata?.source_url || "Unknown source",
        type: d.metadata?.type || "document",
        sessionId: d.metadata?.sessionId || "unknown",
      })),
      debug: {
        sessionId: sessionId,
        hasVectorStore: true,
        documentsFound: docs.length,
        model: process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro",
        responseLength: response.content?.length || 0,
      },
    };

    console.log(`[CHAT API] Response generated successfully for session: ${sessionId}`);
    return NextResponse.json(result);

  } catch (error) {
    console.error("[CHAT API] Error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
