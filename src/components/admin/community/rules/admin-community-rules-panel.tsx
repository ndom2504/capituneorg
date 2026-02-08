"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Rules = {
  publishMode: "ADMIN_ONLY" | "PRO_ONLY" | "ALL_USERS";
  commentMode: "ADMIN_ONLY" | "PRO_ONLY" | "ALL_USERS";
  allowLinks: boolean;
  allowImages: boolean;
  spamPostCooldownSeconds: number;
  maxPostsPerDay: number;
  bannedWords: string[];
  bannedWordsAction: "HIDE" | "WARN" | "BLOCK";
};

type RulesResponse = {
  canAct: boolean;
  rules: Rules;
  meta?: {
    updatedAt?: string | null;
    updatedByAdmin?: { id: string; fullName: string; email: string } | null;
  };
  error?: string;
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const publishModes: Rules["publishMode"][] = ["ADMIN_ONLY", "PRO_ONLY", "ALL_USERS"];
const commentModes: Rules["commentMode"][] = ["ADMIN_ONLY", "PRO_ONLY", "ALL_USERS"];
const bannedActions: Rules["bannedWordsAction"][] = ["HIDE", "WARN", "BLOCK"];

export function AdminCommunityRulesPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [rules, setRules] = useState<Rules | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<{ id: string; fullName: string; email: string } | null>(null);

  const bannedWordsText = useMemo(() => {
    if (!rules) return "";
    return (rules.bannedWords ?? []).join("\n");
  }, [rules]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/admin/community/rules", { cache: "no-store" });
      const data = (await res.json()) as RulesResponse;
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        setRules(null);
        return;
      }

      setRules(data.rules);
      setUpdatedAt(data.meta?.updatedAt ?? null);
      setUpdatedBy(data.meta?.updatedByAdmin ?? null);
    } catch {
      setError("Erreur réseau.");
      setRules(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!rules) return;

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const bannedWords = bannedWordsText
        .split("\n")
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, 200);

      const res = await fetch("/api/admin/community/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...rules,
          spamPostCooldownSeconds: Number(rules.spamPostCooldownSeconds),
          maxPostsPerDay: Number(rules.maxPostsPerDay),
          bannedWords,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | ({ ok?: boolean; rules?: Rules; error?: string; meta?: { updatedAt?: string | null } } & Partial<RulesResponse>)
        | null;

      if (!res.ok || !data?.ok || !data.rules) {
        setError(data?.error ?? "Enregistrement impossible.");
        return;
      }

      setRules(data.rules);
      setUpdatedAt(data.meta?.updatedAt ?? null);
      setOk("Règles enregistrées.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>
          {loading
            ? "Chargement…"
            : canAct
              ? "Modifier et enregistrer les règles."
              : "Lecture seule (MODERATOR)."}
          {updatedLabel ? ` · Dernière mise à jour : ${updatedLabel}` : ""}
          {updatedBy ? ` · Par : ${updatedBy.fullName ?? ""}` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-(--radius-md) border border-border bg-white p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-(--radius-md) border border-border bg-white p-3 text-sm text-green-700">
            {ok}
          </div>
        ) : null}

        {!loading && !rules ? (
          <div className="rounded-(--radius-md) border border-border bg-white p-3 text-sm text-muted">
            Impossible de charger les règles.
          </div>
        ) : null}

        {rules ? (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Publication</div>
                <select
                  className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={rules.publishMode}
                  onChange={(e) => setRules({ ...rules, publishMode: e.target.value as Rules["publishMode"] })}
                  disabled={!canAct || saving}
                  aria-label="Mode de publication"
                >
                  {publishModes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Commentaires</div>
                <select
                  className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={rules.commentMode}
                  onChange={(e) => setRules({ ...rules, commentMode: e.target.value as Rules["commentMode"] })}
                  disabled={!canAct || saving}
                  aria-label="Mode de commentaires"
                >
                  {commentModes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Liens</div>
                <select
                  className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={rules.allowLinks ? "true" : "false"}
                  onChange={(e) => setRules({ ...rules, allowLinks: e.target.value === "true" })}
                  disabled={!canAct || saving}
                  aria-label="Autorisation liens"
                >
                  <option value="true">Autoriser</option>
                  <option value="false">Interdire</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Images</div>
                <select
                  className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={rules.allowImages ? "true" : "false"}
                  onChange={(e) => setRules({ ...rules, allowImages: e.target.value === "true" })}
                  disabled={!canAct || saving}
                  aria-label="Autorisation images"
                >
                  <option value="true">Autoriser</option>
                  <option value="false">Interdire</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Cooldown (secondes)</div>
                <Input
                  type="number"
                  value={rules.spamPostCooldownSeconds}
                  onChange={(e) => setRules({ ...rules, spamPostCooldownSeconds: Number(e.target.value) })}
                  disabled={!canAct || saving}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Max posts / jour</div>
                <Input
                  type="number"
                  value={rules.maxPostsPerDay}
                  onChange={(e) => setRules({ ...rules, maxPostsPerDay: Number(e.target.value) })}
                  disabled={!canAct || saving}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-navy">Action mots interdits</div>
              <select
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={rules.bannedWordsAction}
                onChange={(e) =>
                  setRules({ ...rules, bannedWordsAction: e.target.value as Rules["bannedWordsAction"] })
                }
                disabled={!canAct || saving}
                aria-label="Action mots interdits"
              >
                {bannedActions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-navy">Mots interdits (1 par ligne)</div>
              <Textarea
                value={bannedWordsText}
                onChange={(e) => {
                  const next = e.target.value;
                  const arr = next
                    .split("\n")
                    .map((w) => w.trim())
                    .filter(Boolean)
                    .slice(0, 200);
                  setRules({ ...rules, bannedWords: arr });
                }}
                disabled={!canAct || saving}
                placeholder="ex: spam\ninsulte\nhttp://…"
                className="min-h-40"
              />
              <div className="text-xs text-muted">Limite: 200 entrées.</div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="bg-navy hover:bg-navy/90"
                onClick={() => void onSave()}
                disabled={!canAct || saving}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
                Rafraîchir
              </Button>
              {!canAct ? <div className="text-sm text-muted">Actions désactivées.</div> : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
