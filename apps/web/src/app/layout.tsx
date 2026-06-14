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
            <nav className="hidden items-center gap-6 text-sm text-white/80 sm:flex">
              <Link href="/" className="hover:text-white">
                Industries
              </Link>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
                Provenance-first intelligence
              </span>
            </nav>
          </div>
        </header>

        <div className="shell py-8">{children}</div>

        <footer className="shell border-t border-slate-200/70 py-8 text-xs text-ink-400">
          Bellwether — every signal traces to a source record. Choose an industry; see where the
          market is heading.
        </footer>
      </body>
    </html>
  );
}
