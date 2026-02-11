import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { StatusPill } from "@/components/dossier/status-pill";
import { Stepper } from "@/components/dossier/stepper";
import {
  deriveStepperIndex,
  globalStatusIntent,
  resolveDemandeurGlobalStatus,
} from "@/lib/dossier/utils";
import { CaseTabs } from "./case-tabs";

export default async function CaseLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ caseId: string }>;
}) {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
      redirect("/mon-dossier");
  }

  const { caseId } = await params;
  const targetClientId = caseId;

  const [targetUser, targetPreReg, targetDossier] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetClientId },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.preRegistration.findUnique({
        where: { userId: targetClientId },
        include: { review: true },
    }),
    prisma.dossier.findFirst({
        where: { userId: targetClientId },
        orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!targetUser) notFound();

  const globalStatus = resolveDemandeurGlobalStatus({
    dossierStatus: targetDossier?.status ?? null,
    preRegistrationStatus: targetPreReg?.status ?? null,
    reviewStatus: targetPreReg?.review?.status ?? null,
  });
  const { steps, index } = deriveStepperIndex(globalStatus);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Dossier: {targetUser.fullName}</CardTitle>
              <CardDescription>Vue professionnel - Gestion, conformité et traçabilité.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill label={globalStatus} intent={globalStatusIntent(globalStatus)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                    <div className="text-xs text-muted">Client</div>
                    <div className="mt-1 text-sm font-semibold text-navy">
                        {targetUser.fullName}
                    </div>
                    <div className="text-sm text-muted">{targetUser.email}</div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                    <div className="text-xs text-muted">Type de projet</div>
                    <div className="mt-1 text-sm font-medium text-text">
                        {targetPreReg?.mainObjective ?? "—"}
                    </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                    <div className="text-xs text-muted">Urgence</div>
                    <div className="mt-1 text-sm font-medium text-text">—</div>
                </div>
            </div>

            <Stepper steps={steps} currentIndex={index} />

            <CaseTabs caseId={caseId} />

            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled>
                    Demander un document
                </Button>
                <Button size="sm" variant="outline" disabled>
                    Programmer un meeting
                </Button>
                <Button size="sm" variant="outline" disabled>
                    Ajouter une note interne
                </Button>
            </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
