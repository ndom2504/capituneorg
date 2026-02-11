import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CaseParcoursPage() {
  return (
        <Card>
          <CardHeader>
            <CardTitle>Parcours</CardTitle>
            <CardDescription>Pilotage du dossier (validation/pause/étape suivante à brancher).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Historique des changements d’étape (à implémenter) + actions de pilotage.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled>
                Valider l’étape
              </Button>
              <Button size="sm" variant="outline" disabled>
                Mettre en pause
              </Button>
              <Button size="sm" disabled>
                Passer à l’étape suivante
              </Button>
            </div>
          </CardContent>
        </Card>
  );
}
