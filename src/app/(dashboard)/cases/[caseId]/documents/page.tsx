import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { docStatusIntent, docStatusLabel } from "@/lib/dossier/utils";
import { StatusPill } from "@/components/dossier/status-pill";
import { redirect } from "next/navigation";

export default async function CaseDocumentsPage({
    params
}: {
    params: Promise<{ caseId: string }>;
}) {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const { caseId } = await params;

  const targetDossier = await prisma.dossier.findFirst({
        where: { userId: caseId },
        orderBy: { createdAt: "desc" },
        include: { documents: true },
  });

  const targetDocuments = (targetDossier?.documents ?? []).map((d) => {
    const label = docStatusLabel(d.status);
    return { id: d.id, name: d.name, status: label, intent: docStatusIntent(label), note: d.note };
  });

  return (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Contrôle, conformité et versioning.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-xs text-muted">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Commentaire visible client</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targetDocuments.length === 0 ? (
                    <tr className="border-t border-border">
                      <td className="px-4 py-4 text-muted" colSpan={4}>
                        Aucun document pour ce client.
                      </td>
                    </tr>
                  ) : (
                    targetDocuments.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-text">{d.name}</td>
                        <td className="px-4 py-3">
                          <StatusPill label={d.status} intent={d.intent} />
                        </td>
                        <td className="px-4 py-3 text-muted">{d.note ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled>
                              Valider
                            </Button>
                            <Button size="sm" variant="outline" disabled>
                              Refuser
                            </Button>
                            <Button size="sm" variant="ghost" disabled>
                              Télécharger
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
  );
}
