"use client";

import { withBasePath } from "@/lib/utils";

export function isEmbeddedAppBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent || "";
  const isCapacitor =
    window.location.protocol === "capacitor:" ||
    Boolean((window as Window & { Capacitor?: unknown }).Capacitor);
  const isElectron = userAgent.includes("Electron");
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isCapacitor || isElectron || isStandalone;
}

export function toAppHref(path: string) {
  return withBasePath(path);
}
