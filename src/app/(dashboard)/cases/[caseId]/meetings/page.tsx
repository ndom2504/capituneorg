import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function CaseMeetingsPage({
  params
}: {
  params: Promise<{ caseId: string }>;
}) {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const { caseId } = await params;

  const meetings = await prisma.meeting.findMany({
    where: { proId: viewer.id, clientId: caseId },
    orderBy: { startsAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      startsAt: true,
      durationMin: true,
      locationUrl: true,
      notesInternal: true,
    },
  });

  return (
        <Card>
          <CardHeader>
            <CardTitle>Meetings</CardTitle>
            <CardDescription>Coordination et suivi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {meetings.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
                Aucun meeting pour ce client.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="px-4 py-3">Titre</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Lien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-text">{m.title}</td>
                        <td className="px-4 py-3 text-muted">{m.status}</td>
                        <td className="px-4 py-3 text-muted">
                          {m.startsAt.toLocaleString("fr-CA")}
                        </td>
                        <td className="px-4 py-3">
                          {m.locationUrl ? (
                            <a
                              className="text-sm font-semibold text-primary underline"
                              href={m.locationUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir
                            </a>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
    );
}
