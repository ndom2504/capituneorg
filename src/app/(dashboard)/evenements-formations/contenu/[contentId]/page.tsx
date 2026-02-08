import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentEnrollActions } from "@/components/pro-content/content-enroll-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function isPublished(args: {
  type: "EVENT" | "TRAINING";
  eventStatus: string | null;
  publishStatus: string;
}) {
  if (args.type === "EVENT") return args.eventStatus === "PUBLISHED";
  return args.publishStatus === "PUBLISHED";
}

export default async function ContenuDetailPage({ params }: { params: { contentId: string } }) {
  const viewer = await getAppViewer();

  const item = await prisma.contentItem.findUnique({
    where: { id: params.contentId },
    select: {
      id: true,
      type: true,
      ownerId: true,
      title: true,
      description: true,
      isPaid: true,
      priceCents: true,
      currency: true,
      targetRole: true,
      eventStatus: true,
      publishStatus: true,
      startsAt: true,
      owner: { select: { fullName: true } },
    },
  });

  if (!item) notFound();

  if (
    !isPublished({
      type: item.type,
      eventStatus: item.eventStatus ?? null,
      publishStatus: item.publishStatus,
    })
  ) {
    notFound();
  }

  const enrollment = viewer
    ? await prisma.enrollment.findUnique({
        where: { contentId_userId: { contentId: item.id, userId: viewer.id } },
        select: { paymentStatus: true },
      })
    : null;

  const priceLabel = item.isPaid ? formatPrice(item.priceCents, item.currency) : "Gratuit";
  const when = item.startsAt ? new Date(item.startsAt).toLocaleString("fr-CA") : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1">{item.title}</span>
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

          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
        </CardContent>
      </Card>

      <ContentEnrollActions
        viewerId={viewer?.id ?? null}
        contentId={item.id}
        isPaid={item.isPaid}
        priceLabel={priceLabel}
        enrollmentStatus={enrollment?.paymentStatus ?? null}
      />
    </div>
  );
}
