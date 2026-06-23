import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Nodemailer from "next-auth/providers/nodemailer";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js v5 — database sessions.
 *  - Staff sign in with Microsoft Entra ID (M365 identity).
 *  - Clients sign in with a passwordless magic link (Nodemailer/SMTP).
 * Both paths land in the same `User` table; `role` drives RBAC everywhere.
 */
// Each provider is included only when its env is configured, so a partially
// configured environment (or a CI build) doesn't hard-crash at config-eval.
const providers = [];

if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    })
  );
}

if (process.env.EMAIL_SERVER) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Cast bridges a duplicate nested @auth/core copy under @auth/prisma-adapter.
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "database" },
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    // Expose id + role to the session consumed by server components / API.
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role: Role }).role;
      }
      return session;
    },
    // Coarse gate: only signed-in users reach the app shell.
    // Fine-grained RBAC (client scoping, cost data) lives in @/lib/rbac.
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/signin" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/p/"); // public shareable proposal links
      if (isPublic) return true;
      return !!session?.user;
    },
  },
});
