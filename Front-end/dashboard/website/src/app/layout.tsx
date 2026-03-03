import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HydrationBoundary from "@/components/HydrationBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Next Gen Coders - Futuristic Web Development Platform",
  description: "Build your digital empire with cutting-edge web development tools and business solutions. AI-powered, quantum-ready, built for the future.",
  keywords: "web development, AI, quantum computing, business solutions, futuristic technology",
  authors: [{ name: "Next Gen Coders" }],
  robots: "index, follow",
  openGraph: {
    title: "Next Gen Coders - Futuristic Web Development Platform",
    description: "Build your digital empire with cutting-edge web development tools and business solutions.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f23",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <HydrationBoundary>
          {children}
        </HydrationBoundary>
      </body>
    </html>
  );
}
