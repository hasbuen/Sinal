import type { CapacitorConfig } from "@capacitor/cli";

const remoteUrl = process.env.CAPACITOR_REMOTE_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.hasbuen.sinal",
  appName: "Sinal",
  webDir: "out",
  android: {
    allowMixedContent: true,
  },
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          cleartext: false,
          allowNavigation: ["hasbuen.github.io", "sinal-api.vercel.app"],
        },
      }
    : {}),
};

export default config;
