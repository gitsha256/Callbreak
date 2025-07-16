"use client";
import { useEffect } from "react";

export default function ServiceWorkerWrapper() {
  useEffect(() => {
    console.log("✅ ServiceWorkerWrapper mounted");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("✅ Service Worker registered:", reg.scope))
        .catch((err) => console.error("❌ Service Worker registration failed:", err));
    }
  }, []);

  return null;
}
