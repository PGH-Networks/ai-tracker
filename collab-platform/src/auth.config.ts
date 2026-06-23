import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: NO database adapter and NO Node-only providers
 * (Nodemailer pulls in the `stream` module, which the Edge runtime forbids).
 * Used by middleware. The full Node config in `auth.ts` spreads this and adds
 * the Prisma adapter, providers, and the session callback.
 */
export const authConfig = {
  pages: { signIn: "/signin" },
  providers: [], // real providers are added in auth.ts (Node runtime)
  callbacks: {
    // Coarse gate: only signed-in users reach the app shell.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/signin" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/p/"); // public shareable proposal links
      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
