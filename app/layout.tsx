import type { Metadata } from "next";
import { Geist, Geist_Mono, Patrick_Hand, Work_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const handwriting = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-handwriting",
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: "Siap Tempur - Tryout SKD CPNS",
    template: "%s - Siap Tempur"
  },
  description: "Platform belajar SKD CPNS terbaik",
  keywords: ["skd", "twk", "tiu", "tkp", "cat bkn", "bimbel online", "tryout skd", "asn"],

  authors: [{ name: "Siap Tempur Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${handwriting.variable} ${bodyFont.variable} antialiased`}
      >
        {/* Global Background Gradient Mesh - GPU Accelerated */}
        <div className="fixed inset-0 z-[-1] bg-background transform-gpu pointer-events-none">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
        </div>

        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
        {children}
        <Toaster
          position="top-center"
          richColors
          theme="light"
          toastOptions={{
            className: 'font-handwriting border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#fdfbf7]',
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-handwriting)',
            }
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  );
}
