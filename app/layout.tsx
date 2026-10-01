import type { Metadata } from "next";
import "./globals.css";
import AuthenticatedCursor from "@/components/AuthenticatedCursor";

export const metadata: Metadata = {
  title: "TrackOS — Engineering Intelligence & Verifiable Proof of Work",
  description: "Automated deliverable attribution, burnout detection, and cryptographic proof of work for modern engineering teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthenticatedCursor />
        {children}
      </body>
    </html>
  );
}