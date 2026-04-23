import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Clarity Finance",
  description: "Know where you stand. Know what’s next."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
