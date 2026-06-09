import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub PR Code Smell Detector",
  description: "Detect maintainability issues in Pull Request changes before merge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
