import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyHandoff } from "@/lib/whop-auth";

// When the app runs inside the Whop iframe (whop.com → localhost), the session
// cookie has to be `SameSite=None; Secure` or the browser will drop it on the
// cross-site iframe POST that completes signIn. We opt-in to that mode via the
// AUTH_IFRAME_COOKIES env flag — set it for HTTPS dev / production behind Whop.
const iframeCookies = process.env.AUTH_IFRAME_COOKIES === "1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  cookies: iframeCookies
    ? {
        sessionToken: {
          name: "__Secure-authjs.session-token",
          options: {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            path: "/",
          },
        },
        callbackUrl: {
          name: "__Secure-authjs.callback-url",
          options: { sameSite: "none", secure: true, path: "/" },
        },
        csrfToken: {
          name: "__Host-authjs.csrf-token",
          options: { httpOnly: true, sameSite: "none", secure: true, path: "/" },
        },
      }
    : undefined,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "whop",
      name: "Whop",
      credentials: {
        handoff: { label: "Handoff", type: "text" },
      },
      async authorize(credentials) {
        const handoff = credentials?.handoff;
        if (typeof handoff !== "string") return null;
        const verified = verifyHandoff(handoff);
        if (!verified) return null;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, verified.userId))
          .limit(1);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user || !user.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          // Block unverified accounts. We intentionally return null (generic
          // "invalid credentials") rather than throwing a distinct error so we
          // don't leak which addresses are registered. The login UI offers a
          // "didn't get the verification email?" link that any user can click
          // to kick off a resend — this preserves UX without enumeration.
          // Dev escape hatch: set AUTH_DEV_SKIP_VERIFICATION=1 in .env.local
          // to bypass this check during local iteration. Never respected in prod.
          const devSkipVerify =
            process.env.NODE_ENV !== "production" &&
            process.env.AUTH_DEV_SKIP_VERIFICATION === "1";
          if (!user.emailVerified && !devSkipVerify) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
