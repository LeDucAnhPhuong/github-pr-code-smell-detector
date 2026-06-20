import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Same typeface as the dashboard — exposed as a CSS variable for globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: "MergeTrack: Catch code smells before they merge",
  description:
    "MergeTrack analyzes the changed lines in every Pull Request and flags maintainability issues, ranked by severity, before they reach your main branch.",
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "MergeTrack: Catch code smells before they merge",
    description:
      "Static analysis on PR diffs. Findings ranked by severity, posted where your team reviews.",
    images: [{ url: "/logo-with-text.png", width: 312, height: 312, alt: "MergeTrack" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MergeTrack: Catch code smells before they merge",
    description: "Static analysis on PR diffs, ranked by severity.",
    images: ["/logo-with-text.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main" className="lp-skip lp-btn lp-btn-primary">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
