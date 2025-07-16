// components/ClientLayout.tsx
"use client";

import { ReactNode } from "react";
import ServiceWorkerWrapper from "@/components/ServiceWorkerWrapper";
import { ThemeProvider } from "@/components/theme-provider";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ServiceWorkerWrapper />
      {children}
    </ThemeProvider>
  );
}
