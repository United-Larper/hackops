import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow-condensed" });

export const metadata: Metadata = {
  // Absolute base for Open Graph image URLs; set SITE_URL to the public address when deployed.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3200"),
  title: { default: "HackOps", template: "%s · HackOps" },
  description: "Find hackathons, run each one as a project, and turn every entry into portfolio material.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
