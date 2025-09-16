import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  themeColor: "#111827", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-screen bg-gradient-to-br from-black via-purple-900 to-black`}
      >
        {children}
      </body>
    </html>
  );
}