import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CaseHistoriquePage() {
  return (
        <Card>
          <CardHeader>
            <CardTitle>Historique & conformité</CardTitle>
            <CardDescription>Timeline complète (auditabilité à implémenter).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Actions utilisateur / actions pro / justificatifs (à brancher).
            </div>
          </CardContent>
        </Card>
  );
}
