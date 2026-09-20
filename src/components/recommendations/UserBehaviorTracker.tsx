"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import type { BehaviorFeature } from "@/lib/recommendations/types";

interface UserBehaviorTrackerProps {
  isAuthenticated: boolean;
}
function featureForPath(pathname: string): BehaviorFeature | null {
  if (pathname === "/analytics/weather") return "weather";
  if (pathname === "/disease" || pathname.startsWith("/disease/")) {
    return "disease";
  }
  if (
    pathname === "/analytics/yield" ||
    pathname.startsWith("/analytics/yield/")
  ) {
    return "yield";
  }
  if (pathname === "/chatbot") return "chat";
  return null;
}

export default function UserBehaviorTracker({
  isAuthenticated,
}: UserBehaviorTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) return;

    const feature = featureForPath(pathname);
    if (!feature) return;

    const storageKey = `rice-ai:view:${feature}:${pathname}`;
    const now = Date.now();

    try {
      const lastTrackedAt = Number(window.sessionStorage.getItem(storageKey));
      if (Number.isFinite(lastTrackedAt) && now - lastTrackedAt < 30_000) {
        return;
      }
      window.sessionStorage.setItem(storageKey, String(now));
    } catch {
      // Continue without deduplication when storage is unavailable.
    }

    void fetch("/api/user-behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature, path: pathname }),
      keepalive: true,
    }).catch(() => {
      // Behavior tracking must never interrupt the page experience.
    });
  }, [isAuthenticated, pathname]);

  return null;
}
