"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProfileMediaUploader } from "@/components/profile/profile-media-uploader";
import { cn } from "@/lib/cn";
import type { AppViewer } from "@/lib/auth/viewer";

type SettingsDto = {
  userId: string;
  language: "FR" | "EN";
  timezone: string;
  country: string | null;

  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showCountryOnProfile: boolean;
  communityVisible: boolean;

  autoAwayMinutes: number;

  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyRequests: boolean;
  notifyDocuments: boolean;
  notifyPayments: boolean;
  notifyMeetings: boolean;
  notifyEvents: boolean;
  notifyMarketplace: boolean;
  notificationFrequency: "IMMEDIATE";

  allowFollow: boolean;
  showFollowersCount: boolean;
  showBadges: boolean;
  allowReviews: boolean;
  showRatingPublicly: boolean;
  showReviewComments: boolean;

  deletionRequestedAt: string | null;
  deletionScheduledAt: string | null;
};

type ApiGet = {
  viewer: {
    id: string;
    accountType: "USER" | "PROFESSIONAL" | "ADMIN";
    fullName: string;
    email: string;
    avatarUrl: string | null;
    hasPassword: boolean;
    marketplaceProfile: { id: string; status: string; isVerified: boolean } | null;
  };
  settings: SettingsDto;
};

type TabKey =
  | "compte"
  | "confidentialite"
  | "notifications"
  | "presence"
  | "marketplace"
  | "securite"
  | "donnees";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-(--radius-md) px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-primary/12 text-navy" : "text-text hover:bg-black/5",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  recommended,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  recommended?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-(--radius-md) border border-border bg-white/60 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-navy">{label}</div>
          {recommended ? (
            <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs font-semibold text-muted">
              Recommandé
            </span>
          ) : null}
        </div>
        {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border border-border transition-colors",
          checked ? "bg-primary/20" : "bg-surface",
        )}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-border bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-100">
      <div className="rounded-(--radius-md) border border-border bg-surface px-4 py-3 text-sm font-semibold text-navy shadow-lg">
        {message}
      </div>
    </div>
  );
}

export function SettingsPage({ viewer, presenceEnabled = true }: { viewer: AppViewer; presenceEnabled?: boolean }) {
  const isPro = viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN";

  const [activeTab, setActiveTab] = React.useState<TabKey>("compte");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const [api, setApi] = React.useState<ApiGet | null>(null);

  const [fullName, setFullName] = React.useState(viewer.fullName);
  const [country, setCountry] = React.useState<string>("");

  const [form, setForm] = React.useState<Omit<SettingsDto, "userId"> | null>(null);

  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [manualStatus, setManualStatus] = React.useState<"" | "PAUSE" | "ABSENT" | "MUTE" | "MEETING">("");

  React.useEffect(() => {
    // Deep-linking minimal via /parametres?tab=...
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      const allowed: TabKey[] = [
        "compte",
        "confidentialite",
        "notifications",
        "presence",
        "marketplace",
        "securite",
        "donnees",
      ];
      if (tab && allowed.includes(tab as TabKey)) {
        setActiveTab(tab as TabKey);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (presenceEnabled) return;
    setActiveTab((t) => (t === "presence" ? "compte" : t));
  }, [presenceEnabled]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const dataUnknown = (await res.json().catch(() => null)) as unknown;
        const dataErr = (dataUnknown as { error?: string } | null)?.error;
        if (!res.ok) throw new Error(dataErr || `HTTP ${res.status}`);
        if (cancelled) return;

        const payload = dataUnknown as ApiGet;
        setApi(payload);
        setFullName(payload.viewer.fullName);
        setCountry(payload.settings.country ?? "");

        // Exclure userId (non éditable)
        const { userId: _discard, ...rest } = payload.settings;
        void _discard;
        setForm(rest);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPresenceStatus() {
      try {
        if (!presenceEnabled) return;

        const res = await fetch(`/api/presence?userIds=${encodeURIComponent(viewer.id)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as Record<
          string,
          { statusManual: string | null } | undefined
        > | null;

        const statusManual = data?.[viewer.id]?.statusManual ?? null;
        if (cancelled) return;

        if (statusManual === "PAUSE" || statusManual === "ABSENT" || statusManual === "MUTE" || statusManual === "MEETING") {
          setManualStatus(statusManual);
        } else {
          setManualStatus("");
        }
      } catch {
        // Best effort: on laisse le statut par défaut.
      }
    }

    loadPresenceStatus();

    return () => {
      cancelled = true;
    };
  }, [viewer.id, presenceEnabled]);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const dirty = React.useMemo(() => {
    if (!api || !form) return false;

    const base = api.settings;

    const keys: Array<
      keyof Omit<
        SettingsDto,
        "userId" | "deletionRequestedAt" | "deletionScheduledAt"
      >
    > = [
      "language",
      "timezone",
      "country",
      "showOnlineStatus",
      "showLastSeen",
      "showCountryOnProfile",
      "communityVisible",
      "autoAwayMinutes",
      "notifyInApp",
      "notifyEmail",
      "notifyRequests",
      "notifyDocuments",
      "notifyPayments",
      "notifyMeetings",
      "notifyEvents",
      "notifyMarketplace",
      "notificationFrequency",
      "allowFollow",
      "showFollowersCount",
      "showBadges",
      "allowReviews",
      "showRatingPublicly",
      "showReviewComments",
    ];

    for (const key of keys) {
      const currentValue =
        key === "country"
          ? country.trim() ? country.trim() : null
          : form[key];

      if (base[key] !== currentValue) return true;
    }

    return api.viewer.fullName !== fullName;
  }, [api, form, country, fullName]);

  async function save() {
    if (!api || !form) return;

    setSaving(true);
    setError(null);

    try {
      // 1) Profil (nom)
      if (fullName.trim() !== api.viewer.fullName.trim()) {
        const res = await fetch("/api/user-profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Échec mise à jour du nom.");
        }
      }

      // 2) Settings
      const res2 = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country: country.trim() ? country.trim() : null,
        }),
      });

      if (!res2.ok) {
        const data = (await res2.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Échec enregistrement des paramètres.");
      }

      const next = (await res2.json().catch(() => null)) as { settings?: SettingsDto } | null;
      const nextSettings = next?.settings;

      setApi((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          viewer: { ...prev.viewer, fullName },
          settings: nextSettings ?? prev.settings,
        };
      });

      setToast("Paramètres enregistrés ✅");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function testHeartbeat() {
    try {
      const res = await fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setToast(res.status === 404 ? "Présence désactivée" : "Échec heartbeat");
        return;
      }
      setToast("Heartbeat envoyé ✅");
    } catch {
      setToast("Échec heartbeat");
    }
  }

  async function requestDeleteAccount() {
    if (!api) return;

    setDeleteLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: deleteConfirm,
          password: deletePassword,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string; deletionScheduledAt?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Échec de la demande de suppression.");
      }

      setToast("Demande de suppression enregistrée ✅");
      setDeleteConfirm("");
      setDeletePassword("");

      // Refresh settings
      const res2 = await fetch("/api/settings", { cache: "no-store" });
      if (res2.ok) {
        const payload = (await res2.json().catch(() => null)) as ApiGet | null;
        if (payload) setApi(payload);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-navy">Paramètres</h1>
        <div className="text-sm text-muted">Chargement…</div>
      </div>
    );
  }

  if (error && !api) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-navy">Paramètres</h1>
        <div className="rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!api || !form) return null;

  const rawTabs: Array<{ key: TabKey; label: string; show?: boolean }> = [
    { key: "compte", label: "Compte" },
    { key: "confidentialite", label: "Confidentialité" },
    { key: "notifications", label: "Notifications" },
    { key: "presence", label: "Statut & présence", show: presenceEnabled },
    { key: "marketplace", label: "Marketplace & performance", show: isPro },
    { key: "securite", label: "Sécurité" },
    { key: "donnees", label: "Données" },
  ];
  const tabs = rawTabs.filter((t) => t.show !== false);

  const showEmailV2 = false;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Paramètres</h1>
          <div className="mt-1 text-sm text-muted">
            {presenceEnabled
              ? "Compte, confidentialité, notifications et présence."
              : "Compte, confidentialité et notifications."}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Onglets paramètres">
        {tabs.map((t) => (
          <TabButton key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {error ? (
        <div className="rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {activeTab === "compte" ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Compte</div>
                <div className="mt-1 text-sm text-muted">Informations de base du compte.</div>
              </div>

              <ProfileMediaUploader kind="avatar" initialUrl={api.viewer.avatarUrl} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-navy">Nom / prénom</div>
                  <div className="mt-1">
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-navy">Pays de résidence</div>
                  <div className="mt-1">
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Canada" />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-navy">Langue préférée</div>
                  <div className="mt-1">
                    <select
                      className="h-11 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                      aria-label="Langue préférée"
                      title="Langue préférée"
                      value={form.language}
                      onChange={(e) => setForm((p) => (p ? { ...p, language: e.target.value === "EN" ? "EN" : "FR" } : p))}
                    >
                      <option value="FR">FR</option>
                      <option value="EN">EN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-navy">Fuseau horaire</div>
                  <div className="mt-1">
                    <Input
                      value={form.timezone}
                      onChange={(e) => setForm((p) => (p ? { ...p, timezone: e.target.value } : p))}
                      placeholder="UTC"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "confidentialite" ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Confidentialité</div>
                <div className="mt-1 text-sm text-muted">Contrôle de la visibilité et de la présence.</div>
              </div>

              <div className="space-y-2">
                <Toggle
                  checked={form.showOnlineStatus}
                  onChange={(v) => setForm((p) => (p ? { ...p, showOnlineStatus: v } : p))}
                  label="Afficher mon statut en ligne"
                  hint="Si OFF, les autres ne voient pas votre statut en ligne ni votre pastille." 
                  recommended
                />
                <Toggle
                  checked={form.showLastSeen}
                  onChange={(v) => setForm((p) => (p ? { ...p, showLastSeen: v } : p))}
                  label="Afficher “vu il y a…”"
                  hint="Masque la date de dernière activité." 
                />
                <Toggle
                  checked={form.showCountryOnProfile}
                  onChange={(v) => setForm((p) => (p ? { ...p, showCountryOnProfile: v } : p))}
                  label="Afficher mon pays sur mon profil"
                />
                <Toggle
                  checked={form.communityVisible}
                  onChange={(v) => setForm((p) => (p ? { ...p, communityVisible: v } : p))}
                  label="Profil visible dans la communauté"
                  hint="Mode discret: vous n’apparaissez pas dans l’annuaire." 
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Notifications</div>
                <div className="mt-1 text-sm text-muted">Canaux et préférences.</div>
              </div>

              <div className="space-y-2">
                <Toggle
                  checked={form.notifyInApp}
                  onChange={(v) => setForm((p) => (p ? { ...p, notifyInApp: v } : p))}
                  label="Notifications dans l’app (cloche)"
                  recommended
                />

                <div className={cn(!showEmailV2 && "opacity-60")}
                  aria-disabled={!showEmailV2}
                >
                  <Toggle
                    checked={form.notifyEmail}
                    onChange={(v) => {
                      if (!showEmailV2) return;
                      setForm((p) => (p ? { ...p, notifyEmail: v } : p));
                    }}
                    label="Email"
                    hint={showEmailV2 ? "" : "V2"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Toggle
                  checked={form.notifyRequests}
                  onChange={(v) => setForm((p) => (p ? { ...p, notifyRequests: v } : p))}
                  label="Demandes / dossiers"
                  recommended
                />
                <Toggle
                  checked={form.notifyDocuments}
                  onChange={(v) => setForm((p) => (p ? { ...p, notifyDocuments: v } : p))}
                  label="Documents"
                />
                <Toggle
                  checked={form.notifyMeetings}
                  onChange={(v) => setForm((p) => (p ? { ...p, notifyMeetings: v } : p))}
                  label="Rendez-vous"
                />
                <Toggle
                  checked={form.notifyEvents}
                  onChange={(v) => setForm((p) => (p ? { ...p, notifyEvents: v } : p))}
                  label="Événements & formations"
                />
                <Toggle
                  checked={form.notifyMarketplace}
                  onChange={(v) => setForm((p) => (p ? { ...p, notifyMarketplace: v } : p))}
                  label="Marketplace"
                />
              </div>

              <div>
                <div className="text-sm font-semibold text-navy">Fréquence</div>
                <div className="mt-1">
                  <select
                    className="h-11 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                      aria-label="Fréquence des notifications"
                      title="Fréquence des notifications"
                    value={form.notificationFrequency}
                      onChange={() => setForm((p) => (p ? { ...p, notificationFrequency: "IMMEDIATE" } : p))}
                  >
                    <option value="IMMEDIATE">Immédiat</option>
                    <option value="DAILY" disabled>
                      Digest quotidien (V2)
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "presence" ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Statut & présence</div>
                <div className="mt-1 text-sm text-muted">Statut manuel et réglages de présence.</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-navy">Statut</div>
                  <div className="mt-1">
                    <select
                      className="h-11 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                      aria-label="Statut de présence"
                      title="Statut de présence"
                      value={manualStatus}
                      onChange={async (e) => {
                        const v = e.target.value as "" | "PAUSE" | "ABSENT" | "MUTE" | "MEETING";
                        setManualStatus(v);
                        const statusManual = v === "" ? null : v;
                        const res = await fetch("/api/presence/heartbeat", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ statusManual }),
                        });
                        if (!res.ok) {
                          setToast(res.status === 404 ? "Présence désactivée" : "Échec mise à jour du statut");
                          return;
                        }
                        setToast("Statut mis à jour ✅");
                      }}
                    >
                      <option value="">Disponible</option>
                      <option value="PAUSE">En pause</option>
                      <option value="ABSENT">Absent</option>
                      <option value="MUTE">Muet</option>
                      <option value="MEETING">En rencontre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-navy">Auto-absent après</div>
                  <div className="mt-1">
                    <select
                      className="h-11 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                      aria-label="Auto-absent après"
                      title="Auto-absent après"
                      value={form.autoAwayMinutes}
                      onChange={(e) =>
                        setForm((p) => (p ? { ...p, autoAwayMinutes: Number(e.target.value) } : p))
                      }
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                  <div className="mt-1 text-xs text-muted">V1: réglage stocké. Automatisation complète: V2.</div>
                </div>
              </div>

              <div>
                <Button onClick={testHeartbeat} className="bg-navy hover:bg-navy/90">
                  Tester (envoie heartbeat)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "marketplace" && isPro ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Marketplace & performance</div>
                <div className="mt-1 text-sm text-muted">Profil, avis et indicateurs.</div>
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy">Profil marketplace</div>
                    <div className="mt-1 text-xs text-muted">
                      Modifier votre profil et suivre l’état de vérification.
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      État: {api.viewer.marketplaceProfile ? `${api.viewer.marketplaceProfile.status}${api.viewer.marketplaceProfile.isVerified ? " · Vérifié ✅" : ""}` : "—"}
                    </div>
                  </div>
                  <Link href="/clients/marketplace-profil">
                    <Button className="bg-navy hover:bg-navy/90">Modifier</Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <Toggle
                  checked={form.allowFollow}
                  onChange={(v) => setForm((p) => (p ? { ...p, allowFollow: v } : p))}
                  label="Autoriser les abonnements"
                />
                <Toggle
                  checked={form.showFollowersCount}
                  onChange={(v) => setForm((p) => (p ? { ...p, showFollowersCount: v } : p))}
                  label="Afficher nombre d’abonnés"
                />
                <Toggle
                  checked={form.showBadges}
                  onChange={(v) => setForm((p) => (p ? { ...p, showBadges: v } : p))}
                  label="Afficher mes badges"
                />
              </div>

              <div className="space-y-2">
                <Toggle
                  checked={form.allowReviews}
                  onChange={(v) => setForm((p) => (p ? { ...p, allowReviews: v } : p))}
                  label="Autoriser les avis"
                  recommended
                />
                <Toggle
                  checked={form.showRatingPublicly}
                  onChange={(v) => setForm((p) => (p ? { ...p, showRatingPublicly: v } : p))}
                  label="Afficher la note moyenne publiquement"
                />
                <Toggle
                  checked={form.showReviewComments}
                  onChange={(v) => setForm((p) => (p ? { ...p, showReviewComments: v } : p))}
                  label="Afficher les commentaires"
                />
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-navy">Performance</div>
                <div className="mt-1 text-xs text-muted">Affichage info seulement (V1).</div>
                <div className="mt-2 text-xs text-muted">
                  Voir: <Link className="font-semibold text-navy hover:underline" href="/profil">Profil</Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "securite" ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Sécurité</div>
                <div className="mt-1 text-sm text-muted">Accès, sessions et mot de passe.</div>
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-navy">Changer mot de passe</div>
                <div className="mt-1 text-xs text-muted">
                  {api.viewer.hasPassword
                    ? "V2: formulaire de changement (current/new)."
                    : "Ce compte utilise un fournisseur OAuth (pas de mot de passe local)."}
                </div>
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-navy">Sessions</div>
                <div className="mt-1 text-xs text-muted">V2: liste des sessions et déconnexion globale.</div>
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-navy">2FA</div>
                <div className="mt-1 text-xs text-muted">V2</div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "donnees" ? (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-navy">Données</div>
                <div className="mt-1 text-sm text-muted">Export et suppression.</div>
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-navy">Exporter mes données</div>
                <div className="mt-1 text-xs text-muted">V2</div>
              </div>

              <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
                <div className="text-sm font-semibold text-navy">Supprimer mon compte</div>
                <div className="mt-1 text-xs text-muted">
                  Confirmation + mot de passe si applicable. Délai: 7 jours.
                </div>

                {api.settings.deletionScheduledAt ? (
                  <div className="mt-2 rounded-(--radius-md) border border-border bg-surface p-3 text-xs text-muted">
                    Suppression planifiée pour: {new Date(api.settings.deletionScheduledAt).toLocaleString()}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-muted">Tapez SUPPRIMER</div>
                    <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted">Mot de passe</div>
                    <Input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder={api.viewer.hasPassword ? "Votre mot de passe" : "(non requis)"}
                      disabled={!api.viewer.hasPassword}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    onClick={requestDeleteAccount}
                    disabled={deleteLoading}
                    className="bg-navy hover:bg-navy/90"
                  >
                    {deleteLoading ? "Traitement…" : "Confirmer la suppression"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-40 -mx-3 border-t border-border bg-surface/90 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="text-sm text-muted">
            {dirty ? "Modifications non enregistrées" : "Tout est à jour"}
          </div>
          <Button
            onClick={save}
            disabled={!dirty || saving}
            className="bg-navy hover:bg-navy/90"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}
