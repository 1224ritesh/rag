// app/api/chat/route.js
import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getVectorStore } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { question, k = 4 } = await req.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Get vector store and search for relevant documents
    const vectorStore = await getVectorStore();
    const docs = await vectorStore.similaritySearch(question, k);

    if (docs.length === 0) {
      return NextResponse.json({
        answer:
          "I don't have any relevant information to answer your question. Please make sure you have uploaded some documents first.",
        sources: [],
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
        "You are a helpful assistant. Use the provided context to answer questions accurately and concisely. If you cannot find the answer in the context, say so clearly. Always cite your sources using [1], [2], etc.",
      ],
      ["human", `Context:\n${contextText}\n\nQuestion: ${question}`],
    ];

    // Initialize Gemini chat model
    const chat = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro",
      temperature: 0.0,
    });

    // Get response from the model
    const response = await chat.invoke(messages);

    return NextResponse.json({
      answer: response.content,
      sources: docs.map((d, i) => ({
        id: i + 1,
        source:
          d.metadata?.source || d.metadata?.source_url || "Unknown source",
      })),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
