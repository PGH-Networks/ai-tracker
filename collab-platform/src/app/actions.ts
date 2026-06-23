"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Visibility,
  ProjectKind,
  RecordProvider,
  RoadmapStatus,
  ProposalStatus,
} from "@prisma/client";
import { requireUser } from "@/lib/rbac";
import { createClient } from "@/lib/data/clients";
import { createProject } from "@/lib/data/projects";
import { createNote } from "@/lib/data/notes";
import { createManualMeeting } from "@/lib/data/meetings";
import { createQuickLink, deleteQuickLink } from "@/lib/data/quicklinks";
import { createRoadmapItem, createBudgetItem } from "@/lib/data/roadmap";
import { createEstimate, addLineItem } from "@/lib/data/estimates";
import { createProposalFromEstimate, setProposalStatus } from "@/lib/data/proposals";

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

// ---------------- Phase 3: planning & financials ----------------

export async function createRoadmapItemAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createRoadmapItem(user, {
    clientId,
    projectId: opt(formData, "projectId"),
    title: str(formData, "title"),
    description: opt(formData, "description"),
    status: (opt(formData, "status") as RoadmapStatus) ?? RoadmapStatus.PLANNED,
    startDate: opt(formData, "startDate"),
    endDate: opt(formData, "endDate"),
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function createBudgetItemAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createBudgetItem(user, {
    roadmapItemId: str(formData, "roadmapItemId"),
    label: str(formData, "label"),
    amount: Number(str(formData, "amount") || 0),
    internalOnly: formData.get("internalOnly") === "on",
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function createEstimateAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createEstimate(user, {
    projectId: str(formData, "projectId"),
    name: str(formData, "name") || "Estimate",
  });
  revalidatePath(`/clients/${clientId}/calculator`);
}

export async function addLineItemAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await addLineItem(user, {
    estimateId: str(formData, "estimateId"),
    role: str(formData, "role"),
    description: opt(formData, "description"),
    hours: Number(str(formData, "hours") || 0),
    costRate: Number(str(formData, "costRate") || 0),
    sellRate: Number(str(formData, "sellRate") || 0),
  });
  revalidatePath(`/clients/${clientId}/calculator`);
}

export async function createProposalAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await createProposalFromEstimate(user, {
    estimateId: str(formData, "estimateId"),
    title: str(formData, "title") || "Proposal",
  });
  revalidatePath(`/clients/${clientId}/calculator`);
  revalidatePath(`/clients/${clientId}`);
}

export async function setProposalStatusAction(formData: FormData) {
  const user = await requireUser();
  const clientId = str(formData, "clientId");
  await setProposalStatus(
    user,
    str(formData, "id"),
    str(formData, "status") as ProposalStatus
  );
  revalidatePath(`/clients/${clientId}`);
}
