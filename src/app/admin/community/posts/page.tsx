import { AdminCommunityPostsPanel } from "@/components/admin/community/posts/admin-community-posts-panel";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminCommunityPostsPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) redirect("/admin");

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Communauté</h1>
        <div className="text-sm text-muted">Modération des posts & annonces (V1).</div>
      </div>

      <AdminCommunityPostsPanel viewerRole={role} />
    </div>
  );
}
