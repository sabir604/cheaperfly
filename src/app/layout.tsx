import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClientBoot } from "@/components/providers";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Cheaperfly — Flights, Hotels & Umrah", template: "%s · Cheaperfly" },
  description: "Compare flights, book hotels and plan Umrah with Cheaperfly. Transparent prices, flexible fares and 24/7 support.",
  applicationName: "Cheaperfly",
};

export const viewport: Viewport = {
  themeColor: "#071F42",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-semibold text-navy-900 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
        <ClientBoot />
      </body>
    </html>
  );
}
