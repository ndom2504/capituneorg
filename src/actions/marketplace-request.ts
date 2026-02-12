"use server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMarketplaceRequest(formData: FormData) {
  const viewer = await getAppViewer();
  if (!viewer) throw new Error("Vous devez être connecté pour faire une demande.");

  const proId = formData.get("proId") as string;
  const message = formData.get("message") as string;
  const topic = (formData.get("topic") as any) || "OTHER";
  
  if (!proId) throw new Error("Professionnel non spécifié.");

  const request = await prisma.marketplaceRequest.create({
    data: {
      requesterId: viewer.id,
      professionalId: proId,
      message,
      topic,
      status: "PENDING",
    },
  });

  revalidatePath("/clients/demandes");
  redirect(`/clients/demandes/${request.id}`);
}
