"use client";

import { useEffect } from "react";
import { isEmbeddedAppBrowser } from "@/lib/runtime";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (isEmbeddedAppBrowser()) {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .then(async () => {
        if (!("caches" in window)) {
          return;
        }

        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      })
      .catch(() => {
        // Non-blocking: stale browser caches should not break the app shell.
      });
  }, []);

  return null;
}
