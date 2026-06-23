import {
  PrismaClient,
  Role,
  ClientStatus,
  ProjectKind,
  Visibility,
  RoadmapStatus,
  ProposalStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmails = (process.env.ADMIN_EMAILS || "gregorypack1@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  // Staff (ADMIN). Auth.js will reuse these rows on first Entra/magic-link login.
  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: Role.ADMIN },
      create: { email, name: email.split("@")[0], role: Role.ADMIN },
    });
  }

  // A sample client with nested Goal -> Project -> Initiative.
  const client = await prisma.client.upsert({
    where: { id: "seed-client-acme" },
    update: {},
    create: {
      id: "seed-client-acme",
      name: "Acme Manufacturing",
      status: ClientStatus.ACTIVE,
      industry: "Manufacturing",
      contactName: "Dana Cole",
      contactEmail: "dana@acme.example",
    },
  });

  const goal = await prisma.project.upsert({
    where: { id: "seed-goal-1" },
    update: {},
    create: {
      id: "seed-goal-1",
      clientId: client.id,
      kind: ProjectKind.GOAL,
      name: "Reduce manual back-office work with AI",
    },
  });

  await prisma.project.upsert({
    where: { id: "seed-proj-1" },
    update: {},
    create: {
      id: "seed-proj-1",
      clientId: client.id,
      parentId: goal.id,
      kind: ProjectKind.PROJECT,
      name: "Invoice ingestion assistant",
    },
  });

  // A demo CLIENT user scoped to Acme only.
  const clientUser = await prisma.user.upsert({
    where: { email: "client@acme.example" },
    update: { role: Role.CLIENT },
    create: { email: "client@acme.example", name: "Dana Cole", role: Role.CLIENT },
  });
  await prisma.clientMembership.upsert({
    where: { userId_clientId: { userId: clientUser.id, clientId: client.id } },
    update: {},
    create: { userId: clientUser.id, clientId: client.id },
  });

  // A client-visible note + an internal-only note to demonstrate the gate.
  await prisma.note.createMany({
    data: [
      {
        clientId: client.id,
        title: "Kickoff summary",
        body: "<p>Agreed on phase 1 scope.</p>",
        visibility: Visibility.CLIENT_VISIBLE,
      },
      {
        clientId: client.id,
        title: "Internal margin notes",
        body: "<p>Do not share — pricing strategy.</p>",
        visibility: Visibility.INTERNAL,
      },
    ],
    skipDuplicates: true,
  });

  // --- Phase 3 demo: roadmap + budget, internal estimate, client proposal ---
  const roadmap = await prisma.roadmapItem.upsert({
    where: { id: "seed-roadmap-1" },
    update: {},
    create: {
      id: "seed-roadmap-1",
      clientId: client.id,
      projectId: "seed-proj-1",
      title: "Phase 1 — Invoice assistant rollout",
      status: RoadmapStatus.IN_PROGRESS,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-09-30"),
    },
  });
  await prisma.budgetItem.createMany({
    data: [
      { roadmapItemId: roadmap.id, label: "Implementation", amount: 18000, internalOnly: false },
      { roadmapItemId: roadmap.id, label: "Internal infra cost", amount: 4200, internalOnly: true },
    ],
    skipDuplicates: true,
  });

  const estimate = await prisma.estimate.upsert({
    where: { id: "seed-estimate-1" },
    update: {},
    create: {
      id: "seed-estimate-1",
      projectId: "seed-proj-1",
      name: "Invoice assistant — build",
    },
  });
  await prisma.estimateLineItem.createMany({
    data: [
      { id: "seed-li-1", estimateId: estimate.id, role: "Solutions Architect", hours: 40, costRate: 90, sellRate: 200, sortOrder: 0 },
      { id: "seed-li-2", estimateId: estimate.id, role: "AI Engineer", hours: 80, costRate: 75, sellRate: 175, sortOrder: 1 },
    ],
    skipDuplicates: true,
  });

  // Client-facing proposal (sell-side only): 40*200 + 80*175 = 22000
  await prisma.proposal.upsert({
    where: { id: "seed-proposal-1" },
    update: {},
    create: {
      id: "seed-proposal-1",
      projectId: "seed-proj-1",
      estimateId: estimate.id,
      title: "Acme — Invoice Ingestion Assistant",
      status: ProposalStatus.SENT,
      publicToken: "demo",
      totalPrice: 22000,
      scope: {
        lines: [
          { role: "Solutions Architect", description: null, hours: 40, amount: 8000 },
          { role: "AI Engineer", description: null, hours: 80, amount: 14000 },
        ],
      },
    },
  });

  console.log("Seed complete:", { admins: adminEmails, client: client.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
