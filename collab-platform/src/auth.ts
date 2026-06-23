import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Nodemailer from "next-auth/providers/nodemailer";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

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
  ...authConfig,
  // Cast bridges a duplicate nested @auth/core copy under @auth/prisma-adapter.
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "database" },
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // Expose id + role to the session consumed by server components / API.
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role: Role }).role;
      }
      return session;
    },
  },
});
