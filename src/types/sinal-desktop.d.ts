export {};

declare global {
  interface Window {
    sinalDesktop?: {
      getInfo: () => Promise<{
        version: string;
        platform: string;
        isPackaged: boolean;
      }>;
      checkForUpdates: () => Promise<{ ok: boolean; reason?: string }>;
      installUpdate: () => Promise<{ ok: boolean }>;
      onUpdaterEvent: (
        callback: (payload: {
          type:
            | "checking"
            | "available"
            | "idle"
            | "downloading"
            | "downloaded"
            | "error";
          detail?: unknown;
        }) => void,
      ) => () => void;
    };
  }
}
