import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CaseEchangesPage() {
  return (
        <Card>
          <CardHeader>
            <CardTitle>Échanges</CardTitle>
            <CardDescription>Client ↔ pro, historique complet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Messagerie dossier à brancher (et rappels envoyés).
            </div>
          </CardContent>
        </Card>
  );
}
