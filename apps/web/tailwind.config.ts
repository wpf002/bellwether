import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand: deep indigo→violet (forward-looking, "where it's heading"),
        // warm amber accent echoing a bell.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        accent: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        ink: {
          DEFAULT: "#0b1020",
          700: "#1e293b",
          500: "#475569",
          400: "#64748b",
        },
        canvas: "#f7f8fc",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,16,32,0.04), 0 8px 24px -12px rgba(11,16,32,0.12)",
        glow: "0 0 0 1px rgba(79,70,229,0.15), 0 12px 32px -12px rgba(79,70,229,0.35)",
      },
      borderRadius: { xl2: "1rem" },
    },
  },
  plugins: [],
} satisfies Config;
