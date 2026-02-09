"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type AccountType = "USER" | "PROFESSIONAL" | "ADMIN";

type DirectoryUser = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  accountType: AccountType;
  isCertified: boolean;
  isFollowed: boolean;
  canFollow: boolean;
  canContact: boolean;
  canPartnership: boolean;
  disabledReason?: string | null;
};

export function ConnectionsCard({
  users,
  viewerAccountType,
}: {
  users: DirectoryUser[];
  viewerAccountType?: AccountType | null;
}) {
  const pros = users.filter((u) => u.accountType === "PROFESSIONAL" || u.accountType === "ADMIN");
  const demandeurs = users.filter((u) => u.accountType === "USER");

  const showDemandeursSection = viewerAccountType !== "USER";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réseau</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Section title="Professionnels / Admin" users={pros} />
        {showDemandeursSection ? <Section title="Demandeurs" users={demandeurs} /> : null}
      </CardContent>
    </Card>
  );
}

function Section({ title, users }: { title: string; users: DirectoryUser[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-navy">{title}</div>
      {users.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
          Aucun compte
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: DirectoryUser }) {
  const [isFollowed, setIsFollowed] = React.useState(user.isFollowed);
  const [busy, setBusy] = React.useState<null | "follow" | "contact" | "partnership">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function toggleFollow() {
    setError(null);
    setOk(null);
    try {
      setBusy("follow");
      const res = await fetch("/api/relationships/follow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { following?: boolean; error?: string }
        | null;
      if (!res.ok || payload?.following == null) {
        setError(payload?.error ?? "Action impossible.");
        return;
      }
      setIsFollowed(payload.following);
    } finally {
      setBusy(null);
    }
  }

  async function contact() {
    setError(null);
    setOk(null);
    try {
      setBusy("contact");
      const res = await fetch("/api/relationships/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { requestId?: string; status?: string; error?: string }
        | null;
      if (!res.ok || !payload?.requestId) {
        setError(payload?.error ?? "Demande impossible.");
        return;
      }
      setOk("Demande de contact envoyée.");
    } finally {
      setBusy(null);
    }
  }

  async function partnership() {
    setError(null);
    setOk(null);
    try {
      setBusy("partnership");
      const res = await fetch("/api/relationships/partnership", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { requestId?: string; status?: string; error?: string }
        | null;
      if (!res.ok || !payload?.requestId) {
        setError(payload?.error ?? "Demande impossible.");
        return;
      }
      setOk("Demande de collaboration envoyée.");
    } finally {
      setBusy(null);
    }
  }

  const disabledTitle = user.disabledReason ?? undefined;

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-16 w-16 rounded-full border border-border bg-white p-2">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
              <span className="text-base font-bold">{user.fullName.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold text-navy">{user.fullName}</div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
            <span
              className={cn(
                "rounded-full border border-border bg-white/60 px-2 py-0.5",
                (user.accountType === "PROFESSIONAL" || user.accountType === "ADMIN") && "text-navy",
              )}
            >
              {user.accountType === "ADMIN"
                ? "Admin"
                : user.accountType === "PROFESSIONAL"
                  ? "Professionnel"
                  : "Demandeur"}
            </span>
            {user.accountType === "PROFESSIONAL" ? (
              <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                {user.isCertified ? "Certifié" : "Non certifié"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={isFollowed ? "outline" : "primary"}
            className={cn(
              "h-9 w-full justify-center text-xs",
              isFollowed
                ? "bg-white/70 text-navy hover:bg-white"
                : "bg-navy text-white hover:bg-navy/90",
            )}
            onClick={toggleFollow}
            disabled={!user.canFollow || busy !== null}
            title={!user.canFollow ? disabledTitle : undefined}
            aria-label={isFollowed ? "Ne plus suivre" : "Suivre"}
          >
            {isFollowed ? <IconCheck /> : <IconUserPlus />}
            <span>{isFollowed ? "Suivi" : "Suivre"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-9 w-full justify-center bg-white/70 text-xs text-navy hover:bg-white"
            onClick={contact}
            disabled={!user.canContact || busy !== null}
            title={!user.canContact ? disabledTitle : undefined}
            aria-label="Contacter"
          >
            <IconMail />
            <span>Contacter</span>
          </Button>
        </div>

        {user.canPartnership ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-full justify-center bg-white/70 text-xs"
            onClick={partnership}
            disabled={busy !== null}
          >
            Partenariat
          </Button>
        ) : null}
      </div>

      {ok ? <div className="mt-2 text-sm text-navy">{ok}</div> : null}
      {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

function IconUserPlus() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16v16H4z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
