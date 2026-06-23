import { redirect } from "next/navigation";
import { requireUser, isStaff } from "@/lib/rbac";
import { AppHeader } from "@/components/AppHeader";
import { createClientAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const user = await requireUser();
  if (!isStaff(user)) redirect("/clients"); // clients can't create clients

  return (
    <>
      <AppHeader user={user} />
      <main className="container" style={{ maxWidth: 640 }}>
        <h2>New Client</h2>
        <form action={createClientAction}>
          <div className="form-grid">
            <div className="full">
              <label htmlFor="name">Name *</label>
              <input id="name" name="name" required />
            </div>
            <div>
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="PROSPECT">
                <option value="PROSPECT">Prospect</option>
                <option value="ACTIVE">Active client</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="industry">Industry</label>
              <input id="industry" name="industry" />
            </div>
            <div>
              <label htmlFor="contactName">Primary contact</label>
              <input id="contactName" name="contactName" />
            </div>
            <div>
              <label htmlFor="contactEmail">Contact email</label>
              <input id="contactEmail" name="contactEmail" type="email" />
            </div>
            <div className="full">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" placeholder="https://" />
            </div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 16 }}>
            Create client
          </button>
        </form>
      </main>
    </>
  );
}
