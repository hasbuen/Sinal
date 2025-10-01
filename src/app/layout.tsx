import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sinal",
  description: "Um aplicativo de chat e mensagens em tempo real para conexões rápidas e seguras.",
  authors: [{ name: "Julio Cesar O. Bueno", url: "https://github.com/hasbuen" }],
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-icon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-screen bg-[#1e1f2b]`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}