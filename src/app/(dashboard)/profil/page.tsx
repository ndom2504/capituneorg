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
          <ProfileInfoEditor
            initialFullName={user?.fullName ?? "Client Capitune"}
            initialEmail={user?.email ?? "client@capitune.local"}
            avatarUrl={user?.avatarUrl}
            coverUrl={user?.coverUrl}
          />

          <div className="space-y-4">
            <div id="avatar">
              <ProfileMediaUploader kind="avatar" initialUrl={user?.avatarUrl} />
            </div>
            <div id="cover">
              <ProfileMediaUploader kind="cover" initialUrl={user?.coverUrl} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-(--radius-md) border border-border bg-white/60 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-navy">
                {user?.fullName.substring(0, 2).toUpperCase() ?? "CU"}
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
            <LogoutButton className="bg-navy hover:bg-navy/90" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
