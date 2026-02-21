import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import ExchangeRateLoader from "@/components/ExchangeRateLoader";
import DemoBanner from "@/components/DemoBanner";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Plate Expectations",
  description: "Decode any menu, anywhere. AI-powered menu translator for travelers.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pe-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${dmSans.className} bg-pe-bg text-pe-text antialiased`}>
        <main className="mx-auto min-h-screen max-w-md">
          <DemoBanner />
          <ExchangeRateLoader />
          {children}
        </main>
      </body>
    </html>
  );
}
