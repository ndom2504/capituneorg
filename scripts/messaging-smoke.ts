import { loadEnvConfig } from "@next/env";

function pickPrisma(mod: any) {
  return mod?.prisma ?? mod?.default?.prisma;
}

async function main() {
  loadEnvConfig(process.cwd(), true);

  // Ensure the Neon adapter path is enabled for this smoke test.
  process.env.USE_NEON_ADAPTER ||= "true";

  // Driver adapters require the library engine.
  process.env.PRISMA_CLIENT_ENGINE_TYPE ||= "library";

  const mod = await import("../src/lib/db");
  const prisma = pickPrisma(mod);
  if (!prisma) throw new Error("Could not load Prisma instance from src/lib/db");

  const suffix = Date.now();

  const requester = await prisma.user.create({
    data: {
      email: `smoke.requester.${suffix}@example.com`,
      fullName: "Smoke Requester",
      accountType: "USER",
    },
  });

  const professional = await prisma.user.create({
    data: {
      email: `smoke.pro.${suffix}@example.com`,
      fullName: "Smoke Pro",
      accountType: "PROFESSIONAL",
      marketplaceProfile: {
        create: {
          profession: "IMMIGRATION_CONSULTANT",
          country: "Canada",
          city: "Montreal",
        },
      },
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      initiatorId: requester.id,
      recipientId: professional.id,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: requester.id,
        content: "Bonjour! (smoke test)",
      },
      {
        conversationId: conversation.id,
        senderId: professional.id,
        content: "Salut, je peux t'aider. (smoke test)",
      },
    ],
  });

  const messagesBefore = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  const unreadForRequesterBefore = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: requester.id },
      isRead: false,
    },
  });

  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: requester.id },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  const unreadForRequesterAfter = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: requester.id },
      isRead: false,
    },
  });

  console.log("Smoke OK:");
  console.log({
    requesterId: requester.id,
    professionalId: professional.id,
    conversationId: conversation.id,
    messages: messagesBefore.map((m: any) => ({
      id: m.id,
      senderId: m.senderId,
      isRead: m.isRead,
      content: m.content,
    })),
    unreadForRequesterBefore,
    unreadForRequesterAfter,
  });
}

main().catch((e) => {
  console.error("Smoke FAILED:", e);
  process.exitCode = 1;
});
