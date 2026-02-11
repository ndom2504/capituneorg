import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 6) return ext;
  return fallbackExt;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { docId } = await params;

  // Verify document ownership
  const document = await prisma.document.findUnique({
    where: { id: docId },
    include: { dossier: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  if (document.dossier.userId !== viewer.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (PDF, PNG, JPEG, WEBP)" },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10MB)" },
      { status: 413 }
    );
  }

  // Determine uploads directory
  // Store in public/uploads/dossier/{dossierId} to keep it organized?
  // Or just public/uploads/dossier/
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "dossier");
  
  try {
      await mkdir(uploadsDir, { recursive: true });
    
      const ext = safeExt(file.name, ".pdf");
      const filename = `${document.dossierId}-${document.id}-${Date.now()}${ext}`;
    
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadsDir, filename), buffer);
    
      const fileUrl = `/uploads/dossier/${filename}`;
    
      // Update document record
      // We assume the schema has url/mimeType fields now
      await prisma.document.update({
        where: { id: docId },
        data: {
          url: fileUrl,
          mimeType: file.type,
          status: "EN_REVUE",
        },
      });
    
      return NextResponse.json({ 
          success: true, 
          fileUrl, 
          status: "EN_REVUE" 
      });

  } catch (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Erreur serveur lors de l'upload" }, { status: 500 });
  }
}
