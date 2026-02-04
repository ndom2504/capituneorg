import { Card } from "@/components/ui/card";

export default function ClientsHistoriquePage() {
  return (
    <Card className="p-6">
      <div className="text-base font-semibold text-navy">Historique</div>
      <div className="mt-2 text-sm text-muted">
        À venir: archivage (préinscriptions refusées/terminées), timeline des
        actions, exports.
      </div>
    </Card>
  );
}
