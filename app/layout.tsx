import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bimbel SKD Premium - Latihan & Simulasi CPNS",
  description: "Platform belajar SKD CPNS terbaik dengan latihan soal TWK, TIU, TKP dan simulasi CAT realtime.",
  keywords: ["cpns", "skd", "twk", "tiu", "tkp", "cat bkn", "bimbel online"],
  authors: [{ name: "Bimbel Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global Background Gradient Mesh - GPU Accelerated */}
        <div className="fixed inset-0 z-[-1] bg-background transform-gpu">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-30 animate-pulse will-change-transform" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] opacity-30 will-change-transform" />
        </div>

        {children}
        <Toaster position="top-center" richColors theme="system" />
        <SpeedInsights />
      </body>
    </html>
  );
}
