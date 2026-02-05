import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileMediaUploader } from "@/components/profile/profile-media-uploader";
import { ProfileInfoEditor } from "@/components/profile/profile-info-editor";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export default async function ProfilPage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { fullName: true, email: true, avatarUrl: true, coverUrl: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profil utilisateur</CardTitle>
          <CardDescription>
            Gérez vos informations de profil et vos médias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-white/60">
            <div className="relative h-28">
              {user?.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.coverUrl}
                  alt="Couverture"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--capitune-navy),var(--capitune-blue))]" />
              )}
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <div className="-mt-10 flex items-end gap-3">
                <div className="h-16 w-16 rounded-full border border-border bg-white p-1 shadow-sm">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
                      CU
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">
                    {user?.fullName ?? "Client Capitune"}
                  </div>
                  <div className="text-sm text-muted">
                    {user?.email ?? "client@capitune.local"}
                  </div>
                </div>
              </div>

              <Button variant="outline">Modifier (bientôt)</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div id="avatar">
              <ProfileMediaUploader kind="avatar" initialUrl={user?.avatarUrl} />
            </div>
            <div id="cover">
              <ProfileMediaUploader kind="cover" initialUrl={user?.coverUrl} />
            </div>
            <ProfileNameEditor initialFullName={user?.fullName ?? "Client Capitune"} />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-navy">
              CU
            </div>
            <div>
              <div className="text-sm font-semibold text-navy">
                {user?.fullName ?? "Client Capitune"}
              </div>
              <div className="text-sm text-muted">
                {user?.email ?? "client@capitune.local"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Programme</div>
              <div className="text-sm font-medium text-text">Immigration Canada</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Objectif</div>
              <div className="text-sm font-medium text-text">Un parcours clair, étape par étape</div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Modifier (bientôt)</Button>
            <LogoutButton className="bg-navy hover:bg-navy/90" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
