import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe NextAuth instance (no Prisma adapter / Nodemailer — those use Node
// APIs the Edge runtime forbids). When AUTH_DISABLED=true there is no gate.
const { auth } = NextAuth(authConfig);

export const middleware =
  process.env.AUTH_DISABLED === "true"
    ? () => NextResponse.next()
    : (auth as unknown as typeof NextResponse.next);

export const config = {
  // Run on everything except static assets and image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
