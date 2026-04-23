import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarity Finance",
  description: "Know where you stand. Know what’s next."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
