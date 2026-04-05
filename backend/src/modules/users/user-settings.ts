export type UserSettings = {
  theme: "system" | "light" | "dark";
  accentTone: "ocean" | "ember" | "forest";
  wallpaper: "aurora" | "graphite" | "sand" | "none";
  compactMode: boolean;
  enterToSend: boolean;
  autoDownloadMedia: boolean;
  readReceipts: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  messagePreview: boolean;
};

export const defaultUserSettings: UserSettings = {
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

type UserSettingsPatch = Partial<UserSettings>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
) {
  return typeof value === "string" && allowed.includes(value)
    ? (value as T[number])
    : fallback;
}

export function normalizeUserSettings(value?: unknown): UserSettings {
  const source = asRecord(value);

  return {
    theme: enumValue(source.theme, ["system", "light", "dark"] as const, defaultUserSettings.theme),
    accentTone: enumValue(
      source.accentTone,
      ["ocean", "ember", "forest"] as const,
      defaultUserSettings.accentTone,
    ),
    wallpaper: enumValue(
      source.wallpaper,
      ["aurora", "graphite", "sand", "none"] as const,
      defaultUserSettings.wallpaper,
    ),
    compactMode: booleanValue(source.compactMode, defaultUserSettings.compactMode),
    enterToSend: booleanValue(source.enterToSend, defaultUserSettings.enterToSend),
    autoDownloadMedia: booleanValue(
      source.autoDownloadMedia,
      defaultUserSettings.autoDownloadMedia,
    ),
    readReceipts: booleanValue(source.readReceipts, defaultUserSettings.readReceipts),
    soundEnabled: booleanValue(source.soundEnabled, defaultUserSettings.soundEnabled),
    desktopNotifications: booleanValue(
      source.desktopNotifications,
      defaultUserSettings.desktopNotifications,
    ),
    messagePreview: booleanValue(source.messagePreview, defaultUserSettings.messagePreview),
  };
}

export function mergeUserSettings(
  current: unknown,
  patch: UserSettingsPatch,
): UserSettings {
  return normalizeUserSettings({
    ...normalizeUserSettings(current),
    ...patch,
  });
}
