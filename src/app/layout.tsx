import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "vibechckd — The Most Vetted Vibe Coders in the Game",
  description:
    "A vetted marketplace for vibe coders. Every coder on vibechckd has been heavily verified. Browse talent, view portfolios, and build project teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body bg-background text-text-primary">
        <SessionProvider><ToastProvider>{children}</ToastProvider></SessionProvider>
      </body>
    </html>
  );
}
