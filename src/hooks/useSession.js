"use client";

import { useState, useEffect } from "react";

export function useSession() {
  const [sessionId, setSessionId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Generate a truly unique session ID with maximum randomness
    const generateSessionId = () => {
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const random3 = Math.random().toString(36).substring(2, 8);
      // Add performance.now() for even more uniqueness
      const perfNow = Math.floor(performance.now() * 1000).toString(36);
      // Add crypto random if available
      const cryptoRandom =
        typeof window !== "undefined" &&
        window.crypto &&
        window.crypto.getRandomValues
          ? Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
              .map((b) => b.toString(36).padStart(2, "0"))
              .join("")
          : Math.random().toString(36).substring(2, 8);

      // Create session ID without relying on user agent for uniqueness
      return `session_${timestamp}_${random1}_${random2}_${random3}_${perfNow}_${cryptoRandom}`.replace(
        /[^a-zA-Z0-9_]/g,
        ""
      );
    };

    // ALWAYS create a completely new session - no persistence
    // This ensures each page load/refresh gets a unique session
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setIsLoaded(true);

    console.log(`[SESSION] Created new session: ${newSessionId}`);

    // Clear any existing session data from storage to ensure clean state
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("rag_session_id");
      localStorage.removeItem("rag_session_id");
    }

    // Cleanup function to clear session when component unmounts
    return () => {
      if (newSessionId) {
        // Optional: Call cleanup API when user leaves
        fetch("/api/clear-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: newSessionId }),
          keepalive: true, // Ensures request completes even if page is closing
        }).catch(() => {}); // Ignore errors during cleanup
      }
    };
  }, []);

  const clearSession = () => {
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    const random3 = Math.random().toString(36).substring(2, 8);
    const perfNow = Math.floor(performance.now() * 1000).toString(36);
    const cryptoRandom =
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.getRandomValues
        ? Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
            .map((b) => b.toString(36).padStart(2, "0"))
            .join("")
        : Math.random().toString(36).substring(2, 8);

    const newSessionId =
      `session_${timestamp}_${random1}_${random2}_${random3}_${perfNow}_${cryptoRandom}`.replace(
        /[^a-zA-Z0-9_]/g,
        ""
      );

    setSessionId(newSessionId);
    console.log(`[SESSION] Cleared and created new session: ${newSessionId}`);

    // Clear any storage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("rag_session_id");
      localStorage.removeItem("rag_session_id");
    }
  };

  const regenerateSession = () => {
    clearSession();
  };

  return { sessionId, clearSession, regenerateSession, isLoaded };
}
