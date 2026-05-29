import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Bellwether",
  description: "Where the market is heading.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
