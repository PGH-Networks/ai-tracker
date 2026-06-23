"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Visibility, ProjectKind, RecordProvider } from "@prisma/client";
import { requireUser } from "@/lib/rbac";
import { createClient } from "@/lib/data/clients";
import { createProject } from "@/lib/data/projects";
import { createNote } from "@/lib/data/notes";
import { createManualMeeting } from "@/lib/data/meetings";
import { createQuickLink, deleteQuickLink } from "@/lib/data/quicklinks";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => {
  const v = str(f, k);
  return v.length ? v : null;
};

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const created = await createClient(user, {
    name: str(formData, "name"),
    status: (opt(formData, "status") as "PROSPECT" | "ACTIVE" | "ARCHIVED") ?? "PROSPECT",
    industry: opt(formData, "industry") ?? undefined,
    contactName: opt(formData, "contactName") ?? undefined,
    contactEmail: opt(formData, "contactEmail") ?? "",
    website: opt(formData, "website") ?? "",
  });
  redirect(`/clients/${created.id}`);
}

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createProject(user, {
    clientId,
    parentId: opt(formData, "parentId"),
    kind: (opt(formData, "kind") as ProjectKind) ?? ProjectKind.PROJECT,
    name: str(formData, "name"),
    description: opt(formData, "description"),
    status: "PLANNED",
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function createNoteAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createNote(user, {
    clientId,
    projectId: opt(formData, "projectId"),
    title: str(formData, "title"),
    body: str(formData, "body"),
    meetingDate: opt(formData, "meetingDate"),
    attendees: opt(formData, "attendees"),
    visibility: (opt(formData, "visibility") as Visibility) ?? Visibility.INTERNAL,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function createMeetingAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createManualMeeting(user, clientId, {
    title: str(formData, "title"),
    meetingDate: opt(formData, "meetingDate"),
    attendees: opt(formData, "attendees"),
    summary: opt(formData, "summary"),
    recordingUrl: opt(formData, "recordingUrl"),
    transcriptUrl: opt(formData, "transcriptUrl"),
    provider: (opt(formData, "provider") as RecordProvider) ?? RecordProvider.FIREFLIES,
    projectId: opt(formData, "projectId"),
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/meetings");
}

export async function createQuickLinkAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createQuickLink(user, {
    clientId,
    projectId: opt(formData, "projectId"),
    label: str(formData, "label"),
    url: str(formData, "url"),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteQuickLinkAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await deleteQuickLink(user, str(formData, "id"));
  revalidatePath(`/clients/${clientId}`);
}
