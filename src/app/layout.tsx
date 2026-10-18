import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Slate — A little idea. A moving picture.",
  description:
    "A calm video workspace for making, comparing and keeping your best take. Transparent costs. Mock generation.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
