// lib/rag.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVectorStore } from "./qdrant.js"; // implement in lib/qdrant.js
// (getVectorStore should return a LangChain QdrantVectorStore instance or wrapper)

// create a single Gemini client instance (server-side)
const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro";

/**
 * retrieveContext - get top-k relevant chunks from Qdrant
 * returns array of Document objects (with pageContent & metadata)
 */
export async function retrieveContext(question, k = 4) {
  const store = await getVectorStore(); // QdrantVectorStore instance from lib/qdrant.js
  // similaritySearch is supported on LangChain Qdrant store
  const docs = await store.similaritySearch(question, k);
  return docs;
}

/**
 * buildPrompt - combine retrieved docs into a single context prompt
 */
function buildPromptFromDocs(docs, question) {
  const context = docs
    .map((d, i) => {
      const src =
        d.metadata?.source ?? d.metadata?.source_url ?? `doc:${i + 1}`;
      const preview = String(d.pageContent || "").slice(0, 1000);
      return `### [${i + 1}] Source: ${src}\n\n${preview}`;
    })
    .join("\n\n---\n\n");

  return `You are a helpful assistant. Answer using ONLY the provided context. If you cannot find the answer in context, say "I don't know."

Context:
${context}

Question:
${question}

Answer (concise, cite sources using [n] where n corresponds to the source list above):`;
}

/**
 * answerQuestion - simple single-shot (non-streaming) answer using Gemini generateContent
 * returns: string
 */
export async function answerQuestion(question, k = 4) {
  const docs = await retrieveContext(question, k);
  const prompt = buildPromptFromDocs(docs, question);

  const model = ai.getGenerativeModel({ model: GEMINI_CHAT_MODEL });
  const resp = await model.generateContent(prompt);

  // response text is available at resp.response.text()
  return {
    answer: resp.response.text(),
    sources: docs.map((d, i) => ({
      id: i + 1,
      source: d.metadata?.source ?? "unknown",
    })),
  };
}

/**
 * streamAnswer - token/fragment streaming using Gemini SDK generateContentStream
 * onChunk is a sync function (text) => void that will be called for each chunk
 * returns after stream completes
 */
export async function streamAnswer(question, k = 4, onChunk = (chunk) => {}) {
  const docs = await retrieveContext(question, k);
  const prompt = buildPromptFromDocs(docs, question);

  const model = ai.getGenerativeModel({ model: GEMINI_CHAT_MODEL });
  const result = await model.generateContentStream(prompt);

  // iterate chunks and call onChunk with chunk.text
  try {
    for await (const chunk of result.stream) {
      // chunk.text contains incremental text pieces
      const text = chunk.text();
      if (text) {
        onChunk(text);
      }
    }
  } catch (err) {
    // bubble up or call onChunk with an error sentinel
    throw err;
  }

  return {
    sources: docs.map((d, i) => ({
      id: i + 1,
      source: d.metadata?.source ?? "unknown",
    })),
  };
}
