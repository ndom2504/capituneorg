import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { StatusPill } from "@/components/dossier/status-pill";
import { Stepper } from "@/components/dossier/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import {
  deriveStepperIndex,
  globalStatusIntent,
  resolveDemandeurGlobalStatus,
} from "@/lib/dossier/utils";

function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors " +
        (active
          ? "border-primary/25 bg-primary/12 text-navy"
          : "border-border bg-white/60 text-text hover:bg-white")
      }
    >
      {children}
    </Link>
  );
}

export default async function MonDossierLayout({ children }: { children: ReactNode }) {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  if (viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN") {
     // TODO: Redirect to the Pro Dashboard equivalent, e.g. /cases or /pro/dossiers
     // For now, let's redirect to /cases to keep separation clear.
     redirect("/cases");
  }

  const [preRegistration, dossier] = await Promise.all([
    prisma.preRegistration.findUnique({
      where: { userId: viewer.id },
      include: {
        review: true,
      },
    }),
    prisma.dossier.findFirst({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const globalStatus = resolveDemandeurGlobalStatus({
    dossierStatus: dossier?.status ?? null,
    preRegistrationStatus: preRegistration?.status ?? null,
    reviewStatus: preRegistration?.review?.status ?? null,
  });

  const { steps, index } = deriveStepperIndex(globalStatus);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Mon dossier</CardTitle>
              <CardDescription>
                Suivi de votre progression et centralisation des éléments utiles.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill label={globalStatus} intent={globalStatusIntent(globalStatus)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Stepper steps={steps} currentIndex={index} />

          <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
            Votre dossier est suivi par un professionnel. Les prochaines étapes vous seront communiquées ici.
          </div>

           {/* 
               We can't easily know which tab is active server-side in a layout without headers(). 
               However, strictly speaking, Layouts don't re-render on nav. 
               To highlight the active tab, we usually use a Client Component interacting with usePathname.
               Let's make a simple client component "DossierTabs" for this.
           */}
           <DossierTabs />

        </CardContent>
      </Card>
      {children}
    </div>
  );
}

import { DossierTabs } from "./dossier-tabs";
