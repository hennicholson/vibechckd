import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";
import { auth } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "vibechckd — The Most Vetted Vibe Coders in the Game",
  description:
    "A vetted marketplace for vibe coders. Every coder on vibechckd has been heavily verified. Browse talent, view portfolios, and build project teams.",
  metadataBase: new URL("https://vibechckd.cc"),
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "vibechckd — The Most Vetted Vibe Coders in the Game",
    description: "Apply to join the most vetted vibe coder network in the game.",
    url: "https://vibechckd.cc",
    siteName: "vibechckd",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "vibechckd — We're looking for the top 1%",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "vibechckd — The Most Vetted Vibe Coders in the Game",
    description: "Apply to join the most vetted vibe coder network in the game.",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pull the session server-side and pass it as `SessionProvider`'s initial
  // value. Without this, `useSession()` triggers a client-side fetch to
  // `/api/auth/session`, which fails inside the Whop iframe because Chrome
  // drops the SameSite=None;Secure session cookie before that fetch runs
  // (third-party cookie blocking). Server-rendering the session means the
  // first render already has the user logged in, so role-aware sidebars and
  // footer CTAs work even when client cookies don't survive.
  //
  // We also disable the periodic + window-focus refetches so a downstream
  // failed fetch can't downgrade an authenticated session to unauthenticated
  // mid-session.
  const initialSession = await auth();

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body bg-background text-text-primary">
        <SessionProvider
          session={initialSession}
          refetchOnWindowFocus={false}
          refetchInterval={0}
        >
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
