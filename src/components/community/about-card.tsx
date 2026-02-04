import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>À propos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-xs text-muted">Mission</div>
          <div className="text-sm text-text">
            Accompagner votre projet d’immigration au Canada avec une gestion
            administrative structurée.
          </div>
        </div>

        <div className="grid gap-2">
          <Info label="Statut" value="Mode local (dev)" />
          <Info label="Espace" value="Communauté (posts admin)" />
          <Info label="Dossier" value="Suivi des documents" />
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          <div className="text-xs font-semibold text-navy">Conseil</div>
          <div className="mt-1 text-sm text-muted">
            Commencez par l’onglet Mon parcours pour la préinscription.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xs font-semibold text-text">{value}</div>
    </div>
  );
}
