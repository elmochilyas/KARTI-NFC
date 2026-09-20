import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Karti — NFC digital contact cards",
    template: "%s — Karti",
  },
  description:
    "Karti — your smart contact card. Share your contact details, social links and business information with one simple tap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
