import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { WhopIframeSdkProvider } from "@whop/react";
import { ToastProvider } from "@/components/Toast";
import QuickChatButton from "@/components/QuickChatButton";
import { auth } from "@/lib/auth";
import "./globals.css";

// Self-hosted fonts via next/font — eliminates the render-blocking
// fonts.googleapis.com stylesheet request on every cold load and ships
// a CSS variable bound to the existing Geist token in globals.css.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Viewport hints for mobile keyboard behavior.
//   `interactiveWidget: "resizes-content"` — when the keyboard slides up,
//   browser pushes content above it instead of overlaying (paired with
//   `h-[100dvh]` containers and `pb-[env(safe-area-inset-bottom)]` on
//   composers, this is what keeps the textarea visible while typing).
//   `maximumScale: 1` — prevents pinch-zoom; combined with `text-[16px]`
//   on inputs, defeats Safari's auto-zoom-on-focus behavior that otherwise
//   shoves the layout sideways.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

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
    <html
      lang="en"
      className={`h-full antialiased ${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full flex flex-col font-body bg-background text-text-primary">
        <SessionProvider
          session={initialSession}
          refetchOnWindowFocus={false}
          refetchInterval={0}
        >
          {/* WhopIframeSdkProvider mounts the postmessage transport regardless
              of context — when running standalone at vibechckd.cc the SDK
              calls just no-op (parent doesn't reply). Components opt into
              real iframe behaviour via useWhopIframeContext() which exposes
              an `isInIframe` boolean, falling back to native window.open /
              <a> behaviour outside Whop. */}
          <WhopIframeSdkProvider>
            <ToastProvider>
              {children}
              {/* Floating bottom-right quick-chat shortcut. Hides itself
                  on /dashboard/inbox and the auth/apply flows. Shares
                  the same useUnreadCount() hook the sidebar consumes,
                  so the dot is always in lockstep with the inbox icon. */}
              <QuickChatButton />
            </ToastProvider>
          </WhopIframeSdkProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
