// lib/qdrant.js
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embeddings.js";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Generate user-specific collection name with timestamp for uniqueness
export function getUserCollectionName(sessionId) {
  const baseCollection = process.env.QDRANT_COLLECTION || "rag_collection";
  // Sanitize sessionId and add prefix for easy identification
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 50);
  return `${baseCollection}_${sanitized}`;
}

// Store active sessions for cleanup
const activeSessions = new Set();

export async function upsertDocuments(docs, sessionId) {
  if (!sessionId) {
    throw new Error("Session ID is required for document isolation");
  }
  
  const collectionName = getUserCollectionName(sessionId);
  console.log(`[QDRANT] Upserting ${docs.length} documents to collection: ${collectionName}`);
  
  // Add session to active sessions
  activeSessions.add(sessionId);
  
  // Add sessionId to all document metadata
  const docsWithSession = docs.map(doc => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      sessionId: sessionId,
      createdAt: new Date().toISOString()
    }
  }));

  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      console.log(`[QDRANT] Creating new collection: ${collectionName}`);
      // Create new collection
      const vectorStore = await QdrantVectorStore.fromDocuments(
        docsWithSession, 
        embeddings, 
        {
          client,
          collectionName,
        }
      );
      return vectorStore;
    } else {
      console.log(`[QDRANT] Adding documents to existing collection: ${collectionName}`);
      // Add to existing collection
      const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        client,
        collectionName,
      });
      await vectorStore.addDocuments(docsWithSession);
      return vectorStore;
    }
  } catch (error) {
    console.error(`[QDRANT] Error upserting documents to ${collectionName}:`, error);
    throw error;
  }
}

export async function getVectorStore(sessionId) {
  if (!sessionId) {
    throw new Error("Session ID is required for document isolation");
  }
  
  const collectionName = getUserCollectionName(sessionId);
  console.log(`[QDRANT] Getting vector store for collection: ${collectionName}`);
  
  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    
    if (!collectionExists) {
      console.log(`[QDRANT] Collection ${collectionName} does not exist`);
      return null;
    }
    
    // Verify collection has documents
    const collectionInfo = await client.getCollection(collectionName);
    if (collectionInfo.points_count === 0) {
      console.log(`[QDRANT] Collection ${collectionName} exists but is empty`);
      return null;
    }
    
    return await QdrantVectorStore.fromExistingCollection(embeddings, {
      client,
      collectionName,
    });
  } catch (error) {
    console.error(`[QDRANT] Error accessing collection ${collectionName}:`, error);
    return null;
  }
}

export async function clearUserCollection(sessionId) {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }
  
  const collectionName = getUserCollectionName(sessionId);
  console.log(`[QDRANT] Clearing collection: ${collectionName}`);
  
  try {
    // Check if collection exists first
    const collections = await client.getCollections();
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    
    if (collectionExists) {
      await client.deleteCollection(collectionName);
      console.log(`[QDRANT] Successfully deleted collection: ${collectionName}`);
      
      // Remove from active sessions
      activeSessions.delete(sessionId);
      return true;
    } else {
      console.log(`[QDRANT] Collection ${collectionName} does not exist`);
      return false;
    }
  } catch (error) {
    console.error(`[QDRANT] Error clearing collection ${collectionName}:`, error);
    throw error;
  }
}

// Cleanup old collections (run periodically or on server start)
export async function cleanupOldCollections() {
  try {
    const collections = await client.getCollections();
    const baseCollection = process.env.QDRANT_COLLECTION || "rag_collection";
    
    for (const collection of collections.collections) {
      if (collection.name.startsWith(`${baseCollection}_session_`)) {
        // Extract timestamp from collection name
        const parts = collection.name.split('_');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[2]);
          const age = Date.now() - timestamp;
          
          // Delete collections older than 24 hours
          if (age > 24 * 60 * 60 * 1000) {
            console.log(`[QDRANT] Cleaning up old collection: ${collection.name}`);
            await client.deleteCollection(collection.name);
          }
        }
      }
    }
  } catch (error) {
    console.error('[QDRANT] Error during cleanup:', error);
  }
}

// Get all collections for debugging
export async function listAllCollections() {
  try {
    const collections = await client.getCollections();
    console.log('[QDRANT] All collections:', collections.collections.map(c => ({
      name: c.name,
      status: c.status
    })));
    return collections.collections;
  } catch (error) {
    console.error('[QDRANT] Error listing collections:', error);
    return [];
  }
}
