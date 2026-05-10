import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guma Basket — Analytics",
  description: "Platform analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
