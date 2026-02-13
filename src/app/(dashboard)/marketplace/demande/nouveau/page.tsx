import { prisma } from "@/lib/db";
import { NewRequestClient } from "@/components/marketplace/new-request-client";
import { redirect } from "next/navigation";

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ proId?: string }> }) {
  const { proId } = await searchParams;

  if (!proId) {
    return <div className="p-8">Paramètre proId manquant.</div>;
  }

  const pro = await prisma.user.findUnique({
    where: { id: proId },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      professionalProfile: {
        select: { headline: true }
      }
    }
  });

  if (!pro) {
      return <div>Professionnel introuvable.</div>;
  }

  return <NewRequestClient pro={{
      id: pro.id,
      fullName: pro.fullName,
      headline: pro.professionalProfile?.headline ?? "",
      avatarUrl: pro.avatarUrl,
  }} />;
}
