import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamTrack AI — Fair Contribution Tracking",
  description: "AI-powered contribution tracking for hackathon teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}