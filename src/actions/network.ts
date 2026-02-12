"use server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { revalidatePath } from "next/cache";

export async function searchProfessionals(query: string) {
  const viewer = await getAppViewer();
  if (!viewer) return [];

  const normalizedQuery = query.toLowerCase().trim();

  const whereClause: any = {
      accountType: "PROFESSIONAL",
      id: { not: viewer.id },
  };

  if (normalizedQuery) {
      whereClause.OR = [
        { fullName: { contains: normalizedQuery, mode: "insensitive" } },
        {
          marketplaceProfile: {
            OR: [
              { profession: { equals: normalizedQuery as any } },
              { city: { contains: normalizedQuery, mode: "insensitive" } },
              { headline: { contains: normalizedQuery, mode: "insensitive" } },
            ],
          },
        },
      ];
  }

  // Find pros that match name, profession, or city
  // Exclude self
  const pros = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      marketplaceProfile: {
        select: {
          profession: true,
          city: true,
          headline: true,
        },
      },
    },
    take: 20,
  });

  // Check status with each pro
  const prosWithStatus = await Promise.all(
    pros.map(async (pro) => {
      // Check for existing request or connection
       const request = await prisma.partnershipRequest.findFirst({
        where: {
          OR: [
            { fromId: viewer.id, toId: pro.id },
            { fromId: pro.id, toId: viewer.id },
          ],
        },
        select: {
          id: true,
          status: true,
          fromId: true,
        },
      });

      return {
        ...pro,
        connectionStatus: request?.status || "NONE", // PENDING, ACCEPTED, REJECTED, NONE
        requestDirection: request ? (request.fromId === viewer.id ? "SENT" : "RECEIVED") : null,
        requestId: request?.id,
      };
    })
  );

  return prosWithStatus;
}

export async function sendPartnershipRequest(targetUserId: string, message: string) {
  const viewer = await getAppViewer();
  if (!viewer) throw new Error("Unauthorized");

  // Check if request already exists
  const existing = await prisma.partnershipRequest.findFirst({
    where: {
      OR: [
        { fromId: viewer.id, toId: targetUserId },
        { fromId: targetUserId, toId: viewer.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "PENDING") {
      throw new Error("Une demande est déjà en cours.");
    }
    if (existing.status === "ACCEPTED") {
      throw new Error("Vous êtes déjà connecté avec cet utilisateur.");
    }
    // If REJECTED, maybe allow re-sending after some time? For now block.
    // Or restart. Let's assume we can create a NEW one or update the old one if it was rejected long ago. 
    // For simplicity, if rejected, we might not allow immediate retry or update status to PENDING.
    // Let's update if rejected.
  }

  if (existing) {
     await prisma.partnershipRequest.update({
        where: { id: existing.id },
        data: {
            status: "PENDING",
            message,
            fromId: viewer.id, // Reset sender to me
            toId: targetUserId
        }
     })
  } else {
      await prisma.partnershipRequest.create({
        data: {
          fromId: viewer.id,
          toId: targetUserId,
          message,
          status: "PENDING",
        },
      });
  }

  revalidatePath("/reseau-pro");
  return { success: true };
}

export async function respondToPartnershipRequest(requestId: string, accept: boolean) {
  const viewer = await getAppViewer();
  if (!viewer) throw new Error("Unauthorized");

  const request = await prisma.partnershipRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.toId !== viewer.id) {
    console.error("Request not found or unauthorized:", requestId);
    throw new Error("Demande introuvable ou non autorisée.");
  }

  await prisma.partnershipRequest.update({
    where: { id: requestId },
    data: {
      status: accept ? "ACCEPTED" : "REJECTED",
    },
  });

  revalidatePath("/reseau-pro");
  return { success: true };
}

export async function getMyNetwork() {
  const viewer = await getAppViewer();
  if (!viewer) return { receivedRequests: [], partners: [] };

  // 1. Received Pending Requests
  const receivedRequests = await prisma.partnershipRequest.findMany({
    where: {
      toId: viewer.id,
      status: "PENDING",
    },
    include: {
      from: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          marketplaceProfile: {
             select: {
                 profession: true,
                 headline: true
             }
          }
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("Found requests:", receivedRequests.length);

  const connections = await prisma.partnershipRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { fromId: viewer.id },
        { toId: viewer.id },
      ],
    },
    include: {
      from: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
           marketplaceProfile: {
             select: {
                 profession: true,
                 headline: true
             }
          }
        },
      },
      to: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
           marketplaceProfile: {
             select: {
                 profession: true,
                 headline: true
             }
          }
        },
      },
    },
  });

  // Map connections to the "other" user
  const partners = connections.map((conn) => {
    const isMeSender = conn.fromId === viewer.id;
    return isMeSender ? conn.to : conn.from;
  });

  return { receivedRequests, partners };
}
