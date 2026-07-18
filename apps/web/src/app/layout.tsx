import type { ReactNode } from "react";

export const metadata = {
  title: "Affiliate GLOBAL",
  description: "Walking skeleton — Week 1 Day 5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          background: "#0b0f14",
          color: "#e6edf3",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
