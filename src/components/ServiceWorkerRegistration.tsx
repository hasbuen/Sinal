"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/utils";
import { isEmbeddedAppBrowser } from "@/lib/runtime";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (isEmbeddedAppBrowser()) {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register(withBasePath("/sw.js")).catch(() => {
      // Non-blocking: the app remains usable even if registration fails.
    });
  }, []);

  return null;
}
