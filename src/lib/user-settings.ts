import type { BackendUserSettings } from "./backend-client";

export const defaultUserSettings: BackendUserSettings = {
  theme: "system",
  accentTone: "ocean",
  wallpaper: "aurora",
  compactMode: false,
  enterToSend: true,
  autoDownloadMedia: true,
  readReceipts: true,
  soundEnabled: true,
  desktopNotifications: true,
  messagePreview: true,
};

export function normalizeUserSettings(
  input?: Partial<BackendUserSettings> | null,
): BackendUserSettings {
  return {
    ...defaultUserSettings,
    ...input,
  };
}

export function resolveThemeMode(theme: BackendUserSettings["theme"]) {
  if (theme !== "system") {
    return theme === "dark";
  }

  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function accentToneClasses(accentTone: BackendUserSettings["accentTone"]) {
  switch (accentTone) {
    case "ember":
      return {
        accent: "#f97316",
        accentSoft: "#ffedd5",
        accentStrong: "#7c2d12",
      };
    case "forest":
      return {
        accent: "#22c55e",
        accentSoft: "#dcfce7",
        accentStrong: "#14532d",
      };
    case "ocean":
    default:
      return {
        accent: "#14b8a6",
        accentSoft: "#ccfbf1",
        accentStrong: "#134e4a",
      };
  }
}

export function wallpaperClass(wallpaper: BackendUserSettings["wallpaper"]) {
  switch (wallpaper) {
    case "graphite":
      return "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_24%),linear-gradient(180deg,#0f172a,#111827)]";
    case "sand":
      return "bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.10),transparent_26%),linear-gradient(180deg,#f8efe3,#efe3d0)]";
    case "none":
      return "bg-transparent";
    case "aurora":
    default:
      return "bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.10),transparent_24%)]";
  }
}

const STORAGE_KEY = "sinal-user-settings";

export function readStoredUserSettings() {
  if (typeof window === "undefined") {
    return defaultUserSettings;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeUserSettings(raw ? JSON.parse(raw) : undefined);
  } catch {
    return defaultUserSettings;
  }
}

export function storeUserSettings(settings: BackendUserSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
