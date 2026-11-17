import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackOps",
  description: "Find hackathons, run each one as a project, and turn every entry into portfolio material.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
