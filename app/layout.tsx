import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarity Finance — Know where you stand. Know what's next.",
  description:
    "Clarity Finance turns your full money picture into a clear score, practical scenarios and a guided plan you can actually follow."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  );
}
