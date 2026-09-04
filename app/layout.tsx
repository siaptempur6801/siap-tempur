import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import { Geist, Geist_Mono, Patrick_Hand, Work_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import LogoutSuccessToast from "@/components/auth/LogoutSuccessToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const handwriting = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-handwriting",
  display: "swap",
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siaptempur.id';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SiapTempur - Persiapan CPNS & TKA",
    template: "%s | SiapTempur"
  },
  description: "Platform belajar CPNS/SKD dan TKA untuk latihan terarah, tryout, pembahasan, serta evaluasi hasil dalam satu akun.",
  keywords: ["siaptempur", "tryout cpns", "tryout skd", "latihan cpns", "twk", "tiu", "tkp", "tka smp", "mini tryout", "full tryout", "latihan soal"],
  authors: [{ name: "SiapTempur" }],
  creator: "SiapTempur",
  publisher: "SiapTempur",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "SiapTempur - Belajar lebih terarah",
    description: "Persiapan CPNS/SKD dan TKA dengan latihan, tryout, pembahasan, dan evaluasi hasil untuk membantu menentukan langkah belajar berikutnya.",
    url: siteUrl,
    siteName: "SiapTempur",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SiapTempur - Persiapan CPNS dan TKA",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  category: "education",
  classification: "Education/Test Prep",
  twitter: {
    card: "summary_large_image",
    title: "SiapTempur - Belajar lebih terarah",
    description: "Persiapan CPNS/SKD dan TKA dengan latihan, tryout, pembahasan, dan evaluasi hasil untuk membantu menentukan langkah belajar berikutnya.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://app.midtrans.com" />
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          geistSans.variable,
          geistMono.variable,
          handwriting.variable,
          bodyFont.variable,
          "antialiased"
        )}
      >
        <div className="fixed inset-0 z-[-1] bg-background transform-gpu pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
        </div>
        {children}
        <Suspense fallback={null}>
          <LogoutSuccessToast />
        </Suspense>
        <Analytics />
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
      </body>
    </html>
  );
}
