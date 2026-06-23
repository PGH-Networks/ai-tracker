import { signIn } from "@/auth";

// Two sign-in paths on one screen: staff (Entra SSO) and clients (magic link).
export default function SignInPage() {
  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <h1 style={{ marginTop: 0 }}>PGH Collab</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Client AI Collaboration Platform
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button className="btn" style={{ width: "100%" }} type="submit">
            Sign in with Microsoft (Staff)
          </button>
        </form>

        <div className="divider">— or, for clients —</div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("nodemailer", {
              email: String(formData.get("email") || ""),
              redirectTo: "/",
            });
          }}
        >
          <label htmlFor="email" className="muted" style={{ fontSize: 13 }}>
            Email a magic link
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
          />
          <button
            className="btn"
            style={{ width: "100%", background: "var(--primary-dark)" }}
            type="submit"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  );
}
