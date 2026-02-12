
"use client";

import { User, MarketplaceProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { updateProProfile } from "@/actions/pro-profile";
import { useState } from "react";

interface Props {
  user: User;
  initialProfile: MarketplaceProfile | null;
}

export function ProProfileDashboardClient({ user, initialProfile }: Props) {
  const [loading, setLoading] = useState(false);

  const languages = (initialProfile?.languagesJson as string[])?.join(", ") || "";
  const specialties = (initialProfile?.specialtiesJson as string[])?.join(", ") || "";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
        await updateProProfile(formData);
        alert("Profil mis à jour !");
    } catch (e) {
        alert("Erreur lors de la mise à jour");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: Avatar & Basic Info */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="flex justify-center mb-4">
                <AvatarBubble name={user.fullName} url={user.avatarUrl} size="xl" className="w-32 h-32 text-3xl" />
            </div>
            
            {/* Upload Mock Button */}
            <Button variant="outline" size="sm" className="mb-6">
                Changer la photo
            </Button>

            <div className="text-left space-y-4">
                <div>
                   <label className="text-sm font-medium text-gray-700">Nom complet</label>
                   <p className="text-navy font-semibold">{user.fullName}</p>
                </div>
                <div>
                   <label className="text-sm font-medium text-gray-700">Email</label>
                   <p className="text-gray-600">{user.email}</p>
                </div>
            </div>
        </div>
        
        {/* Navigation / Status */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-navy mb-4">Statut du Profil</h3>
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${initialProfile?.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-sm font-medium">
                    {initialProfile?.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                </span>
            </div>
            {initialProfile?.isVerified && (
                 <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                     Badge Vérifié Actif
                 </div>
            )}
         </div>
      </div>

      {/* Main Form */}
      <div className="lg:col-span-2">
         <form action={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
             <h2 className="text-xl font-bold text-navy border-b border-gray-100 pb-4">Informations Publiques</h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Nom affiché</label>
                    <Input name="fullName" defaultValue={user.fullName} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Titre professionnel</label>
                    <Input name="headline" defaultValue={initialProfile?.headline || ""} placeholder="Ex: Consultant Immigration ICCRC" />
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Ville</label>
                    <Input name="city" defaultValue={initialProfile?.city || ""} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Pays</label>
                    <Input name="country" defaultValue={initialProfile?.country || "Canada"} />
                 </div>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Années d'Expérience</label>
                <Input 
                    type="number" 
                    name="experienceYears" 
                    defaultValue={initialProfile?.experienceYears || 0} 
                    min={0}
                />
             </div>
             
             <div className="space-y-2">
                <label className="text-sm font-medium">Biographie</label>
                <Textarea 
                    name="bio" 
                    defaultValue={initialProfile?.bioLong || initialProfile?.bioShort || ""} 
                    className="h-32"
                    placeholder="Présentez votre parcours et vos services..."
                />
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Langues parlées (séparées par des virgules)</label>
                <Input name="languages" defaultValue={languages} placeholder="Français, Anglais, Espagnol" />
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Domaines d'expertise (séparés par des virgules)</label>
                <p className="text-xs text-gray-500 mb-1">Affichés sous forme de tuiles sur votre profil (ex: Permis d'études, Entrée Express, Parrainage)</p>
                <Input name="specialties" defaultValue={specialties} placeholder="Permis d'études, Parrainage, Entrée Express" />
                <p className="text-xs text-gray-500">Ces tags apparaîtront sur votre profil public.</p>
             </div>

             <div className="pt-4 flex justify-end">
                 <Button type="submit" disabled={loading} size="lg">
                    {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                 </Button>
             </div>
         </form>
      </div>
    </div>
  );
}
