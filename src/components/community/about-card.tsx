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

        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          <div className="text-xs font-semibold text-navy">Vision</div>
          <div className="mt-1 text-sm text-muted">
            Rendre l’information plus claire, le parcours plus simple, et le suivi plus
            fiable — du premier doute jusqu’au dépôt.
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          <div className="text-xs font-semibold text-navy">Notre promesse</div>
          <div className="mt-1 text-sm text-muted">
            Des étapes concrètes, des documents bien organisés, et un accompagnement
            professionnel quand vous en avez besoin.
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
          <div className="text-xs font-semibold text-navy">Conseil</div>
          <div className="mt-1 text-sm text-muted">
            Commencez par l’onglet Mon dossier pour la préinscription.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
