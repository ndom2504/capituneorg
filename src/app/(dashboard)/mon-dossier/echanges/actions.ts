"use server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function sendDossierMessage(dossierId: string, formData: FormData) {
  const viewer = await getAppViewer();
  if (!viewer) {
    throw new Error("Unauthorized");
  }

  const content = formData.get("content") as string;
  const file = formData.get("file") as File | null;

  if (!content && (!file || file.size === 0)) return;

  // Verify dossier belongs to user
  const dossier = await prisma.dossier.findFirst({
    where: { 
        id: dossierId,
        userId: viewer.id 
    }
  });

  if (!dossier) {
    throw new Error("Dossier not found or access denied");
  }

  let attachmentUrl = null;
  let attachmentName = null;
  let attachmentType = null;

  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = join(process.cwd(), "public", "uploads", "echanges", dossierId);
    
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    
    attachmentUrl = `/uploads/echanges/${dossierId}/${fileName}`;
    attachmentName = file.name;
    attachmentType = file.type;
  }

  // @ts-ignore
  await prisma.dossierMessage.create({
    data: {
      dossierId,
      senderId: viewer.id,
      content: content || "",
      attachmentUrl,
      attachmentName,
      attachmentType
    },
  });

  revalidatePath("/mon-dossier/echanges");
  revalidatePath("/mon-dossier");
}
