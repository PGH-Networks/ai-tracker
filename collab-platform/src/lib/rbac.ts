import "server-only";
import { Prisma, Role, Visibility } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
};

/**
 * Security is intentionally deferred during early build-out.
 * With AUTH_DISABLED=true there is NO login gate — every request runs as a
 * default user so we can build features without standing up Entra/SMTP.
 * Flip AUTH_DISABLED off (or unset) to restore real Auth.js sign-in + RBAC.
 */
const AUTH_DISABLED = process.env.AUTH_DISABLED === "true";

/** Throws if not signed in; returns the session user otherwise. */
export async function requireUser(): Promise<SessionUser> {
  if (AUTH_DISABLED) return getDevUser();
  const session = await auth();
  if (!session?.user?.id) throw new AccessError("Not authenticated", 401);
  return session.user as SessionUser;
}

/**
 * The impersonated user when auth is disabled.
 * Defaults to the first ADMIN in the DB (real id, so writes satisfy FKs).
 * Set DEV_USER_EMAIL to impersonate a specific seeded user — e.g. point it at
 * the seeded CLIENT to exercise the client-scoped views.
 */
async function getDevUser(): Promise<SessionUser> {
  const email = process.env.DEV_USER_EMAIL;
  const u = email
    ? await prisma.user.findUnique({ where: { email } })
    : await prisma.user.findFirst({
        where: { role: Role.ADMIN },
        orderBy: { createdAt: "asc" },
      });
  if (u) return { id: u.id, email: u.email, name: u.name, role: u.role };
  // No users seeded yet — synthesize an admin (writes may fail FKs until seed).
  return { id: "dev-user", email: "dev@local", name: "Dev User", role: Role.ADMIN };
}

export { AUTH_DISABLED };

export class AccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
    this.name = "AccessError";
  }
}

export const isStaff = (u: SessionUser) =>
  u.role === Role.ADMIN || u.role === Role.INTERNAL;
export const isAdmin = (u: SessionUser) => u.role === Role.ADMIN;

/**
 * The set of client ids a user may touch.
 *  - ADMIN / INTERNAL  -> "all" (no restriction)
 *  - CLIENT            -> only clients they're a member of
 */
export async function accessibleClientIds(
  u: SessionUser
): Promise<"all" | string[]> {
  if (isStaff(u)) return "all";
  const memberships = await prisma.clientMembership.findMany({
    where: { userId: u.id },
    select: { clientId: true },
  });
  return memberships.map((m) => m.clientId);
}

/** A Prisma `where` fragment that scopes any Client query to this user. */
export async function clientScopeWhere(
  u: SessionUser
): Promise<Prisma.ClientWhereInput> {
  const ids = await accessibleClientIds(u);
  return ids === "all" ? {} : { id: { in: ids } };
}

/** Throw unless the user may access the given client. */
export async function assertClientAccess(u: SessionUser, clientId: string) {
  const ids = await accessibleClientIds(u);
  if (ids === "all") return;
  if (!ids.includes(clientId))
    throw new AccessError("No access to this client");
}

/**
 * Visibility filter for child content (notes, meetings, boards).
 * CLIENT users only ever see CLIENT_VISIBLE rows; staff see everything.
 */
export function visibilityWhere(u: SessionUser): { visibility?: Visibility } {
  return isStaff(u) ? {} : { visibility: Visibility.CLIENT_VISIBLE };
}

/**
 * Board access — the SAME check the realtime/WebSocket layer must call before
 * letting a socket join a board room. A CLIENT must never receive updates for
 * a board they can't access.
 */
export async function canAccessBoard(
  u: SessionUser,
  boardId: string
): Promise<boolean> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { visibility: true, project: { select: { clientId: true } } },
  });
  if (!board) return false;
  if (isStaff(u)) return true;
  if (board.visibility !== Visibility.CLIENT_VISIBLE) return false; // internal-only board
  const ids = await accessibleClientIds(u);
  return ids === "all" || ids.includes(board.project.clientId);
}

/** True only for staff — gates cost/margin/calculator data. */
export function canSeeInternalFinancials(u: SessionUser): boolean {
  return isStaff(u);
}
