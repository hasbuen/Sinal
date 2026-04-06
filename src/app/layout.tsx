import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import AppUpdateBanner from "@/components/AppUpdateBanner";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { getBasePath } from "@/lib/utils";
import "./globals.css";

const headingSans = Space_Grotesk({
  variable: "--font-sinal-sans",
  subsets: ["latin"],
});

const bodyMono = IBM_Plex_Mono({
  variable: "--font-sinal-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const basePath = getBasePath();

export const metadata: Metadata = {
  title: "Sinal",
  description: "Um aplicativo de chat e mensagens em tempo real para conexoes rapidas e seguras.",
  authors: [{ name: "Julio Cesar O. Bueno", url: "https://github.com/hasbuen" }],
  icons: {
    icon: [
      { url: `${basePath}/favicon.png`, type: "image/png", sizes: "64x64" },
      { url: `${basePath}/icons/icon-192x192.png`, type: "image/png", sizes: "192x192" },
      { url: `${basePath}/icons/icon-512x512.png`, type: "image/png", sizes: "512x512" },
    ],
    shortcut: `${basePath}/favicon.png`,
    apple: `${basePath}/icons/apple-icon-180.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${headingSans.variable} ${bodyMono.variable}`}
    >
      <head>
        <link rel="icon" type="image/png" sizes="64x64" href={`${basePath}/favicon.png`} />
        <meta name="theme-color" content="#14b8a6" />
      </head>
      <body className="min-h-screen w-full overflow-x-hidden bg-[#1e1f2b] antialiased">
        <ServiceWorkerRegistration />
        <AppUpdateBanner />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
