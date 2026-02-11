import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { StatusPill } from "@/components/dossier/status-pill";

export default async function CasesPage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
      redirect("/mon-dossier");
  }

  // Fetch assigned cases
  const assigned = await prisma.preRegistrationReview.findMany({
    where: { assignedProId: viewer.id },
    orderBy: { updatedAt: "desc" },
    include: {
      preRegistration: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mes dossiers suivis</CardTitle>
          <CardDescription>
            Liste des clients que vous accompagnez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
             {assigned.length === 0 ? (
                <div className="col-span-full border p-4 text-center text-muted rounded-md bg-white/50">
                    Aucun dossier assigné.
                </div>
             ) : (
                assigned.map((r) => (
                    <Link key={r.id} href={`/cases/${r.preRegistration.user.id}`}>
                        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="font-semibold text-navy">{r.preRegistration.user.fullName}</div>
                                <StatusPill label={r.status} intent={r.status === 'ACCEPTED' ? 'success' : 'neutral'} /> 
                            </div>
                            <div className="text-sm text-muted">{r.preRegistration.user.email}</div>
                            <div className="mt-2 text-xs text-muted">Mis à jour le {r.updatedAt.toLocaleDateString("fr-CA")}</div>
                        </div>
                    </Link>
                ))
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
