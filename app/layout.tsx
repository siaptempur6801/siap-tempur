import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Geist, Geist_Mono, Patrick_Hand, Work_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";


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
    default: "Siap Tempur - Solusi Persiapan Ujian CPNS, BUMN & TOEFL",
    template: "%s | Siap Tempur"
  },
  description: "Portal persiapan ujian terlengkap di Indonesia. Simulasi tryout SKD CPNS, TKD BUMN, dan TOEFL dengan sistem penilaian standar resmi (CAT BKN) dan ranking nasional. Berjuang cerdas, bukan keras.",
  keywords: ["siap tempur", "tryout cpns", "tryout skd", "cpns 2026", "skd bkn", "tkd bumn", "toefl itp", "simulasi cat bkn", "bimbel cpns murah", "latihan soal cpns"],
  authors: [{ name: "Siap Tempur" }],
  creator: "Siap Tempur",
  publisher: "Siap Tempur",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Siap Tempur - Portal Persiapan Ujian CPNS, BUMN & TOEFL",
    description: "Portal persiapan ujian terlengkap di Indonesia. Simulasi tryout SKD CPNS, TKD BUMN, dan TOEFL dengan sistem penilaian standar resmi (CAT BKN).",
    url: siteUrl,
    siteName: "Siap Tempur",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/og-image.png", // USER: You should add this image to public/ folder
        width: 1200,
        height: 630,
        alt: "Siap Tempur - Portal Persiapan Ujian",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Siap Tempur - Portal Persiapan Ujian CPNS, BUMN & TOEFL",
    description: "Portal persiapan ujian terlengkap di Indonesia. Simulasi tryout SKD CPNS, TKD BUMN, dan TOEFL.",
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
  alternates: {
    canonical: siteUrl,
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
        className={cn(
          geistSans.variable,
          geistMono.variable,
          handwriting.variable,
          bodyFont.variable,
          "antialiased"
        )}
      >
        {/* Global Background Gradient Mesh - GPU Accelerated */}
        <div className="fixed inset-0 z-[-1] bg-background transform-gpu pointer-events-none">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
        </div>
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
