"use client";

import { useState, useEffect } from "react";

export function useClientOnly() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(null);
  const isClient = useClientOnly();

  useEffect(() => {
    if (isClient) {
      setCurrentTime(new Date());
    }
  }, [isClient]);

  return currentTime;
}

export function formatTimeForDisplay(timestamp, fallback = "Just now") {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    if (!timestamp) return fallback;

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return fallback;
  }
}

export function getTimestampSafely() {
  if (typeof window === "undefined") {
    return null;
  }
  return Date.now();
}
