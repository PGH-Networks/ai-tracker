import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Coarse auth gate at the edge. When AUTH_DISABLED=true there is no gate —
// every request passes through (security deferred during build-out).
export const middleware =
  process.env.AUTH_DISABLED === "true"
    ? () => NextResponse.next()
    : (auth as unknown as typeof NextResponse.next);

export const config = {
  // Run on everything except static assets and image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
