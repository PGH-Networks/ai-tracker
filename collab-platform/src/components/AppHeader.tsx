import Link from "next/link";
import { signOut } from "@/auth";
import { AUTH_DISABLED, type SessionUser } from "@/lib/rbac";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="app-header">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1>PGH Collab</h1>
        <nav style={{ display: "flex", gap: 14, fontSize: 14 }}>
          <Link href="/" style={{ color: "#cfe0f5" }}>
            Dashboard
          </Link>
          <Link href="/clients" style={{ color: "#cfe0f5" }}>
            Clients
          </Link>
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {AUTH_DISABLED && (
          <span
            className="role-pill"
            style={{ background: "var(--next-color)", color: "#fff" }}
            title="AUTH_DISABLED=true — no login gate"
          >
            Dev · no auth
          </span>
        )}
        <span className="role-pill">{user.role}</span>
        <span style={{ fontSize: 13, opacity: 0.85 }}>{user.email}</span>
        {!AUTH_DISABLED && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button
              type="submit"
              className="btn"
              style={{ background: "transparent", border: "1px solid #ffffff55", padding: "6px 12px" }}
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
