import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import Script from "next/script"; // ✅ Add Script import

export const metadata: Metadata = {
  title: "Mama Mansion",
  description: "A scorekeeper for the Callbreak card game.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {/* ✅ Inject Adsterra Script */}
        <Script
          id="adsterra-script"
          strategy="afterInteractive"
          data-cfasync="false"
          src="//pl27180240.profitableratecpm.com/9d7ed4e00d722a8ad01ad9a90eb17747/invoke.js"
        />
        {/* ✅ Container to render the ad */}
        <div id="container-9d7ed4e00d722a8ad01ad9a90eb17747" style={{ textAlign: "center" }}></div>

        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
