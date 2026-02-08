import Link from "next/link";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 h-10 px-4";
const buttonPrimary = "bg-primary text-white border border-primary/25 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm";
const buttonOutline = "bg-white/80 text-text border border-border shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-px active:translate-y-0";

function formatPrice(priceCents: number | null, currency: string) {
  if (!priceCents || priceCents <= 0) return "Gratuit";
  const amount = priceCents / 100;
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export default async function CatalogueEvenementsFormationsPage() {
  const viewer = await getAppViewer();

  const items = await prisma.contentItem.findMany({
    where: {
      OR: [
        { type: "EVENT", eventStatus: "PUBLISHED" },
        { type: "TRAINING", publishStatus: "PUBLISHED" },
      ],
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      isPaid: true,
      priceCents: true,
      currency: true,
      startsAt: true,
      owner: { select: { fullName: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Catalogue</h1>
          <p className="text-sm text-muted">
            Événements et formations proposés par des professionnels.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/evenements-formations" className={cn(buttonBase, buttonOutline)}>
            Retour
          </Link>
          {!viewer ? (
            <Link href="/auth" className={cn(buttonBase, buttonPrimary)}>
              Se connecter
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => {
          const priceLabel = item.isPaid ? formatPrice(item.priceCents, item.currency) : "Gratuit";
          const when = item.startsAt ? new Date(item.startsAt).toLocaleString("fr-CA") : null;
          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-sm font-semibold">{priceLabel}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted">
                  <div>
                    <span className="font-medium text-text">Type:</span> {item.type === "EVENT" ? "Événement" : "Formation"}
                  </div>
                  <div>
                    <span className="font-medium text-text">Par:</span> {item.owner.fullName}
                  </div>
                  {when ? (
                    <div>
                      <span className="font-medium text-text">Date:</span> {when}
                    </div>
                  ) : null}
                </div>

                <p className="text-sm leading-relaxed line-clamp-3">{item.description}</p>

                <div>
                  <Link
                    href={`/evenements-formations/contenu/${item.id}`}
                    className={cn(buttonBase, buttonPrimary)}
                  >
                    Voir
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted">Aucun contenu publié pour le moment.</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
