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

  return isCapacitor || isElectron;
}

export function toAppHref(path: string) {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

export function toPublicCallbackHref(path: string) {
  return withBasePath(path);
}
