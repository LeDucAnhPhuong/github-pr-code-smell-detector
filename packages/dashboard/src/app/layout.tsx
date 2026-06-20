import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MergeTrack — PR Code Smell Detector",
    template: "%s · MergeTrack",
  },
  description: "Track. Review. Merge. Detect maintainability issues in Pull Request changes before merge.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "MergeTrack — PR Code Smell Detector",
    description: "Track. Review. Merge. Detect maintainability issues in Pull Request changes before merge.",
    images: [{ url: "/logo-with-text.png", width: 312, height: 312, alt: "MergeTrack" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MergeTrack — PR Code Smell Detector",
    description: "Track. Review. Merge. Detect maintainability issues in Pull Request changes before merge.",
    images: ["/logo-with-text.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
