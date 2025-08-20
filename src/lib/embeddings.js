import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  model: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
  //   optional: {
  //     maxRetries: 3, // Retry up to 3 times on failure
  //     timeout: 10000, // Set a timeout of 10 seconds for requests
  //   },
});
