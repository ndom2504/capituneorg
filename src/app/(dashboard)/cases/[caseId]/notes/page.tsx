import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CaseNotesPage() {
  return (
        <Card>
          <CardHeader>
            <CardTitle>Notes internes</CardTitle>
            <CardDescription>Privé, jamais visible par le demandeur.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Notes internes (observations, risques, décisions) à implémenter.
            </div>
          </CardContent>
        </Card>
  );
}
