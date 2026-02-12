"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createMarketplaceRequest } from "@/actions/marketplace-request";
import { AvatarBubble } from "@/components/ui/avatar-bubble";

interface Props {
  pro?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    headline: string | null;
  } | null;
}

export function NewRequestClient({ pro }: Props) {
  const searchParams = useSearchParams();
  const proId = pro?.id || searchParams.get("proId");

  if (!proId) {
    return <div className="p-8 text-center">Profil professionnel non spécifié.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
           <h1 className="text-2xl font-bold text-navy mb-2">Contacter un Expert</h1>
           {pro && (
             <div className="flex flex-col items-center gap-2 mt-4">
               <AvatarBubble name={pro.fullName} url={pro.avatarUrl} size="lg" />
               <div className="text-center">
                 <p className="font-semibold text-lg">{pro.fullName}</p>
                 <p className="text-gray-500 text-sm">{pro.headline}</p>
               </div>
             </div>
           )}
        </div>

        <form action={createMarketplaceRequest} className="space-y-6">
          <input type="hidden" name="proId" value={proId} />
          
          <div className="space-y-2">
            <Label>Sujet de votre demande</Label>
            <select name="topic" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="IMMIGRATION">Immigration</option>
                <option value="STUDIES">Études</option>
                <option value="WORK">Travail</option>
                <option value="OTHER">Autre</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea 
              name="message" 
              placeholder="Décrivez votre besoin en détails..." 
              rows={6}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-navy hover:bg-navy/90 h-12 text-lg">
            Envoyer la demande
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            En envoyant cette demande, vous acceptez que vos informations de profil soient partagées avec le professionnel.
          </p>
        </form>

      </div>
    </div>
  );
}
