import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ExchangeRateLoader from "@/components/ExchangeRateLoader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Plate Expectations",
  description: "Decode any menu, anywhere. AI-powered menu translator for travelers.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-pe-bg text-pe-text antialiased`}>
        <main className="mx-auto min-h-screen max-w-md">
          <ExchangeRateLoader />
          {children}
        </main>
      </body>
    </html>
  );
}
