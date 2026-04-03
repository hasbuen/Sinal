import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { getBasePath } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const basePath = getBasePath();

export const metadata: Metadata = {
  title: "Sinal",
  description: "Um aplicativo de chat e mensagens em tempo real para conexoes rapidas e seguras.",
  authors: [{ name: "Julio Cesar O. Bueno", url: "https://github.com/hasbuen" }],
  manifest: `${basePath}/manifest.json`,
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <link rel="icon" type="image/png" sizes="64x64" href={`${basePath}/favicon.png`} />
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <meta name="theme-color" content="#059669" />
      </head>
      <body className="min-h-screen w-screen bg-[#1e1f2b] antialiased">
        <ServiceWorkerRegistration />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
