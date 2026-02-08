"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EnrollmentPaymentStatus = "FREE" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export function ContentEnrollActions(props: {
  viewerId: string | null;
  contentId: string;
  isPaid: boolean;
  priceLabel: string;
  enrollmentStatus: EnrollmentPaymentStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const status = props.enrollmentStatus;

  const cta = (() => {
    if (!props.viewerId) return "Se connecter pour s’inscrire";
    if (!props.isPaid) return status === "FREE" ? "Inscription confirmée" : "S’inscrire (gratuit)";
    if (status === "PAID") return "Paiement confirmé";
    if (status === "PENDING") return "Reprendre le paiement";
    if (status === "FAILED") return "Réessayer le paiement";
    if (status === "REFUNDED") return "Payer à nouveau";
    return "Payer";
  })();

  const disabled = (() => {
    if (isPending) return true;
    if (!props.viewerId) return false;
    if (!props.isPaid) return status === "FREE";
    return status === "PAID";
  })();

  useEffect(() => {
    // UX post-checkout: affiche un message + déclenche un refresh léger si le webhook n'a pas encore synchronisé.
    try {
      const url = new URL(window.location.href);
      const payment = url.searchParams.get("payment");
      const sessionId = url.searchParams.get("session_id");

      if (payment === "success") {
        setNotice(
          props.isPaid
            ? "Paiement reçu. Confirmation en cours…"
            : "Inscription confirmée.",
        );

        // Nettoie l'URL pour éviter des refresh loops.
        url.searchParams.delete("payment");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());

        // Refresh unique si on attend encore le webhook.
        if (props.isPaid && status !== "PAID") {
          const key = `content-payment-refresh:${props.contentId}:${sessionId ?? ""}`;
          const already = window.sessionStorage.getItem(key);
          if (!already) {
            window.sessionStorage.setItem(key, "1");
            window.setTimeout(() => window.location.reload(), 1500);
          }
        }
      }

      if (payment === "cancel") {
        setNotice("Paiement annulé.");
        url.searchParams.delete("payment");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // ignore
    }
  }, [props.contentId, props.isPaid, status]);

  async function onAction() {
    setError(null);

    if (!props.viewerId) {
      window.location.href = "/auth";
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/content-items/${props.contentId}/enroll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; url?: string; error?: string; alreadyPaid?: boolean; free?: boolean }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Action impossible");
        return;
      }

      if (payload?.alreadyPaid) {
        window.location.reload();
        return;
      }

      if (payload?.free) {
        window.location.reload();
        return;
      }

      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }

      setError("Réponse inattendue.");
    });
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {notice ? <div className="text-sm text-muted">{notice}</div> : null}
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold">Inscription</div>
            <div className="text-muted">
              {props.isPaid ? `Prix: ${props.priceLabel}` : "Gratuit"}
              {status ? ` · Statut: ${status}` : ""}
            </div>
          </div>
          <Button onClick={onAction} disabled={disabled}>
            {cta}
          </Button>
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </CardContent>
    </Card>
  );
}
