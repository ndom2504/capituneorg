import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function MonDossierHistoriquePage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const [preRegistration, dossier] = await Promise.all([
    prisma.preRegistration.findUnique({
      where: { userId: viewer.id },
      include: {
        review: true,
      },
    }),
    prisma.dossier.findFirst({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
      include: { documents: true },
    }),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
        <CardDescription>Traçabilité des étapes et des actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted">
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          Préinscription: {preRegistration ? preRegistration.status : "—"}
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          Revue: {preRegistration?.review?.status ?? "—"}
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          Documents: {dossier?.documents.length ?? 0} élément(s)
        </div>
      </CardContent>
    </Card>
  );
}
