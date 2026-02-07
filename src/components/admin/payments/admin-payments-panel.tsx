"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

type ResponsePayload = {
  canAct: boolean;
  items: OrderItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const orderStatusOptions = ["", "DRAFT", "PENDING_PAYMENT", "PAID", "CANCELED", "REFUNDED"] as const;
const paymentStatusOptions = ["", "CREATED", "SUCCEEDED", "FAILED", "REFUNDED"] as const;

function formatMoney(amountCents: number, currency: string) {
  const cur = (currency || "cad").toUpperCase();
  return `${(amountCents / 100).toFixed(2)} ${cur}`;
}

export function AdminPaymentsPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [q, setQ] = useState("");
  const [orderStatus, setOrderStatus] = useState<(typeof orderStatusOptions)[number]>("");
  const [paymentStatus, setPaymentStatus] = useState<(typeof paymentStatusOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [openPaymentsByOrderId, setOpenPaymentsByOrderId] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (orderStatus) params.set("orderStatus", orderStatus);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);

      const url = params.toString() ? `/api/admin/payments?${params.toString()}` : "/api/admin/payments";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ResponsePayload & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        setItems([]);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError("Erreur réseau.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, orderStatus, paymentStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiements</CardTitle>
        <CardDescription>
          Suivi V1 (orders + paiements Stripe).{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} order(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (user, order, stripe)…" />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[210px]"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value as (typeof orderStatusOptions)[number])}
              aria-label="Filtrer statut order"
            >
              {orderStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "Tous statuts order"}
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[210px]"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as (typeof paymentStatusOptions)[number])}
              aria-label="Filtrer statut paiement"
            >
              {paymentStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "Tous statuts paiement"}
                </option>
              ))}
            </select>

            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Rafraîchir
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">{error}</div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">Aucun paiement.</div>
        )}

        <div className="space-y-3">
          {rows.map((o) => {
            const created = new Date(o.createdAt).toLocaleString();
            const amount = formatMoney(o.amountCents, o.currency);
            const paymentsOpen = openPaymentsByOrderId[o.id] === true;

            return (
              <Card key={o.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">{o.service.title}</CardTitle>
                    <div className="text-xs text-muted">{created}</div>
                  </div>
                  <CardDescription>
                    Order: {o.status} · Montant: {amount} · Paiements: {o.payments.length}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-sm text-muted">
                    Acheteur: <Link className="text-primary hover:underline" href={`/admin/users/${o.buyer.id}`}>{o.buyer.fullName}</Link>
                    <span className="text-muted"> · {o.buyer.email}</span>
                  </div>

                  <div className="text-sm text-muted">
                    Provider: <Link className="text-primary hover:underline" href={`/admin/users/${o.provider.id}`}>{o.provider.fullName}</Link>
                    <span className="text-muted"> · {o.provider.email}</span>
                  </div>

                  {o.marketplaceRequestId ? (
                    <div className="text-xs text-muted">MarketplaceRequest: {o.marketplaceRequestId}</div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      onClick={() => setOpenPaymentsByOrderId((prev) => ({ ...prev, [o.id]: !paymentsOpen }))}
                      disabled={o.payments.length === 0}
                    >
                      {paymentsOpen ? "Masquer les paiements" : "Voir les paiements"}
                    </Button>

                    {!canAct && <div className="text-sm text-muted sm:ml-auto">Lecture seule.</div>}
                  </div>

                  {paymentsOpen && (
                    <div className="rounded-[var(--radius-md)] border border-border bg-white p-3">
                      <div className="mb-2 text-sm font-medium text-navy">Paiements Stripe</div>
                      <div className="space-y-2">
                        {o.payments.map((p) => (
                          <div key={p.id} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                            <div className="text-sm">Statut: {p.status}</div>
                            <div className="text-xs text-muted">Créé: {new Date(p.createdAt).toLocaleString()}</div>
                            {p.paidAt ? <div className="text-xs text-muted">Payé: {new Date(p.paidAt).toLocaleString()}</div> : null}
                            {p.stripeCheckoutSessionId ? (
                              <div className="text-xs text-muted">Checkout session: {p.stripeCheckoutSessionId}</div>
                            ) : null}
                            {p.stripePaymentIntentId ? (
                              <div className="text-xs text-muted">Payment intent: {p.stripePaymentIntentId}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted">Order ID: {o.id}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
