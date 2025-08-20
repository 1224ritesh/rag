// lib/qdrant.js
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embeddings.js";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

/* array of LangChain Document objects */
export async function upsertDocuments(docs) {
  // docs are the splitted chunks (pageContent + metadata)
  const vectorStore = await QdrantVectorStore.fromDocuments(docs, embeddings, {
    client,
    collectionName: process.env.QDRANT_COLLECTION || "rag_collection",
  });
  return vectorStore;
}

export async function getVectorStore() {
  // return a store pointing to existing collection
  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    client,
    collectionName: process.env.QDRANT_COLLECTION || "rag_collection",
  });
}
