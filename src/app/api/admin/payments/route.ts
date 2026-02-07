import { NextRequest, NextResponse } from "next/server";

import { requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentItem = {
  id: string;
  status: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  createdAt: string;
};

type OrderItem = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  canceledAt: string | null;
  marketplaceRequestId: string | null;
  buyer: { id: string; fullName: string; email: string };
  provider: { id: string; fullName: string; email: string };
  service: { id: string; title: string; providerUserId: string | null };
  payments: PaymentItem[];
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const orderStatus = (req.nextUrl.searchParams.get("orderStatus") ?? "").trim();
  const paymentStatus = (req.nextUrl.searchParams.get("paymentStatus") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const items = await prisma.paymentOrder.findMany({
    where: {
      ...(orderStatus ? { status: orderStatus as any } : {}),
      ...(paymentStatus ? { payments: { some: { status: paymentStatus as any } } } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { marketplaceRequestId: { contains: q, mode: "insensitive" } },
              { buyerUser: { id: { contains: q, mode: "insensitive" } } },
              { buyerUser: { fullName: { contains: q, mode: "insensitive" } } },
              { buyerUser: { email: { contains: q, mode: "insensitive" } } },
              { providerUser: { id: { contains: q, mode: "insensitive" } } },
              { providerUser: { fullName: { contains: q, mode: "insensitive" } } },
              { providerUser: { email: { contains: q, mode: "insensitive" } } },
              { service: { title: { contains: q, mode: "insensitive" } } },
              {
                payments: {
                  some: {
                    OR: [
                      { stripeCheckoutSessionId: { contains: q, mode: "insensitive" } },
                      { stripePaymentIntentId: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    include: {
      buyerUser: { select: { id: true, fullName: true, email: true } },
      providerUser: { select: { id: true, fullName: true, email: true } },
      service: { select: { id: true, title: true, providerUserId: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          stripeCheckoutSessionId: true,
          stripePaymentIntentId: true,
          paidAt: true,
          createdAt: true,
        },
      },
    },
  });

  const payload: OrderItem[] = items.map((o) => ({
    id: o.id,
    status: String(o.status),
    amountCents: o.amountCents,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    paidAt: toIso(o.paidAt),
    canceledAt: toIso(o.canceledAt),
    marketplaceRequestId: o.marketplaceRequestId,
    buyer: o.buyerUser,
    provider: o.providerUser,
    service: o.service,
    payments: o.payments.map((p) => ({
      id: p.id,
      status: String(p.status),
      stripeCheckoutSessionId: p.stripeCheckoutSessionId,
      stripePaymentIntentId: p.stripePaymentIntentId,
      paidAt: toIso(p.paidAt),
      createdAt: p.createdAt.toISOString(),
    })),
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}
