import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Karti — NFC digital contact cards",
    template: "%s — Karti",
  },
  description:
    "Karti is an NFC digital contact-card platform: premium public profiles with remotely configurable card destinations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
