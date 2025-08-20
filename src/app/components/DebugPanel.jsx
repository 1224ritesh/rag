"use client";

import { useState } from "react";

export default function DebugPanel({ sessionId }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug-collections");
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug-collections", {
        method: "DELETE",
      });
      const data = await response.json();
      console.log("Cleanup result:", data);
      await fetchCollections(); // Refresh list
    } catch (error) {
      console.error("Error during cleanup:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-200 rounded-lg p-4 mt-4">
      <h3 className="font-semibold text-black mb-3">🔧 Debug Panel</h3>

      <div className="space-y-2 text-sm text-black">
        <div>
          <strong>Current Session:</strong>
          <code className="bg-gray-200 px-1 rounded ml-1">
            {sessionId && typeof sessionId === "string"
              ? sessionId
              : "Loading..."}
          </code>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={fetchCollections}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : "List Collections"}
          </button>

          <button
            onClick={cleanupOldCollections}
            disabled={loading}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
          >
            Cleanup Old
          </button>
        </div>

        {collections.length > 0 && (
          <div className="mt-3">
            <strong>Collections ({collections.length}):</strong>
            <div className="max-h-32 overflow-y-auto mt-1">
              {collections.map((col, idx) => (
                <div key={idx} className="text-xs text-gray-600 py-1">
                  {col.name} ({col.status})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
