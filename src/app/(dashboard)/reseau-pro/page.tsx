import { getAppViewer } from "@/lib/auth/viewer";
import { getMyNetwork, searchProfessionals } from "@/actions/network";
import { NetworkPageClient } from "@/components/network/network-page-client";
import { redirect } from "next/navigation";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const metadata = {
  title: "Réseau Pro | Capitune",
  description: "Gérez votre réseau de partenaires stratégiques",
};

export default async function ReseauProPage() {
  const viewer = await getAppViewer();
  if (!viewer) return redirect("/auth");
  
  // Feature flag check
  const flags = await getFeatureFlagsFromDb();
  if (!flags.proNetwork) {
       return (
           <div className="max-w-4xl mx-auto p-8 text-center">
               <h1 className="text-2xl font-bold text-navy">Fonctionnalité désactivée</h1>
               <p className="mt-4 text-muted-foreground">
                   Le réseau professionnel n'est pas disponible pour le moment.
               </p>
           </div>
       )
  }

  // Only Pros/Admins can access this
  // Relaxed check: Allow explicit ADMIN accountType OR adminRole present
  const isAdmin = viewer.accountType === "ADMIN" || viewer.adminRole === "ADMIN";
  
  if (viewer.accountType !== "PROFESSIONAL" && !isAdmin) {
       return (
           <div className="max-w-4xl mx-auto p-8 text-center">
               <h1 className="text-2xl font-bold text-navy">Accès réservé</h1>
               <p className="mt-4 text-muted-foreground">
                   Cette fonctionnalité de réseau stratégique est réservée aux comptes professionnels.
               </p>
           </div>
       )
  }

  const networkData = await getMyNetwork();
  const initialPros = await searchProfessionals("");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <NetworkPageClient 
          initialNetworkData={networkData} 
          initialPros={initialPros}
          viewerId={viewer.id}
      />
    </div>
  );
}
