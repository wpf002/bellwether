import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Bellwether — market intelligence",
  description: "Choose an industry. See where the market is heading — every claim cited.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 shadow-lg">
          <div className="shell flex h-16 items-center justify-between">
            <Link href="/" className="transition-opacity hover:opacity-90">
              <Logo />
            </Link>
            <nav className="flex items-center gap-5 text-sm text-white/80">
              <Link href="/" className="hidden hover:text-white sm:inline">
                Industries
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            </nav>
          </div>
        </header>

        <div className="shell py-8">{children}</div>
      </body>
    </html>
  );
}
