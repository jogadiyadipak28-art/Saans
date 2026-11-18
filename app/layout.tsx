import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saans — Clearer air, one day at a time",
  description: "Personalized, practical guidance for navigating urban air pollution.",
};

// A per-request CSP nonce is only available during dynamic rendering. Keep the
// document SSR'd so Next can apply that nonce to its runtime and hydration scripts.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers><Shell>{children}</Shell></Providers>
      </body>
    </html>
  );
}
