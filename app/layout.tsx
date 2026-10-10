import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nagi Book Store",
  description: "Discover English books at Nagi Book Store.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
