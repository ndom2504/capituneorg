import Link from "next/link";

import { AdminUserDetailTabs } from "@/components/admin/users/admin-user-detail-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage(
  props: { params: Promise<{ userId: string }> },
) {
  const viewer = await getAppViewer();
  const viewerRole = viewer?.adminRole ?? "MODERATOR";

  const { userId } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      accountType: true,
      adminRole: true,
      accountStatus: true,
      createdAt: true,
      suspendedAt: true,
      marketplaceProfile: { select: { id: true, verificationStatus: true } },
    },
  });

  if (!user) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Utilisateur introuvable</h1>
          <div className="text-sm text-muted">
            <Link href="/admin/users" className="underline">
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [notes, history] = await Promise.all([
    prisma.userAdminNote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        admin: { select: { fullName: true, email: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { objectType: "User", objectId: user.id },
          ...(user.marketplaceProfile?.id
            ? [{ objectType: "MarketplaceProfile", objectId: user.marketplaceProfile.id }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        objectType: true,
        objectId: true,
        createdAt: true,
        admin: { select: { fullName: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted">
          <Link href="/admin/users" className="underline">
            Retour aux utilisateurs
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-navy">{user.fullName}</h1>
        <div className="text-sm text-muted">{user.email}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
          <CardDescription>Statut et type de compte.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-text">
          <div>
            <span className="text-muted">Type:</span> {user.accountType}
            {user.accountType === "ADMIN" ? ` (${user.adminRole})` : ""}
          </div>
          <div>
            <span className="text-muted">Statut:</span> {user.accountStatus}
            {user.suspendedAt ? ` · Suspendu le ${user.suspendedAt.toISOString()}` : ""}
          </div>
          {user.marketplaceProfile ? (
            <div>
              <span className="text-muted">Profil marketplace:</span> {user.marketplaceProfile.verificationStatus}
            </div>
          ) : null}
          <div>
            <span className="text-muted">Créé le:</span> {user.createdAt.toISOString()}
          </div>
        </CardContent>
      </Card>

      <AdminUserDetailTabs
        userId={user.id}
        viewerRole={viewerRole}
        notes={notes.map((n) => ({
          id: n.id,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
          admin: n.admin,
        }))}
        history={history.map((h) => ({
          id: h.id,
          action: h.action,
          objectType: h.objectType,
          objectId: h.objectId,
          createdAt: h.createdAt.toISOString(),
          admin: h.admin,
        }))}
      />
    </div>
  );
}
