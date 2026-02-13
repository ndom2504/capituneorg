
"use client";

import { User, ProfessionalProfile } from "@prisma/client";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Calendar, Mail, MessageSquare, Star, Briefcase, Globe, Award } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PublicProfileViewProps {
  user: User;
  profile: ProfessionalProfile;
}

export function PublicProfileView({ user, profile }: PublicProfileViewProps) {
  const [activeTab, setActiveTab] = useState("ABOUT");

  const languages = (profile.languagesJson as string[]) || [];
  const expertise = (profile.specialtiesJson as string[] | { label: string }[]) || [];
  
  // Normalize expertise to simpler string array for display
  const expertiseList = expertise.map(e => typeof e === 'string' ? e : e.label);

  const stats = [
    { label: "Projets Gérés", value: profile.completedMissions.toString(), icon: Briefcase },
    { label: "Taux de satisfaction", value: profile.ratingAvg ? `${(profile.ratingAvg * 20).toFixed(0)}%` : "N/A", icon: Star },
    { label: "Années d'Expérience", value: "10+", icon: Award },
    { label: "Langues", value: languages.length.toString(), icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header / Banner */}
      <div className="h-48 md:h-64 bg-navy relative overflow-hidden">
        {user.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={user.coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-transparent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Identity Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              <div className="relative -mt-20 md:-mt-0 md:-mb-12 shrink-0">
                <AvatarBubble 
                  name={user.fullName} 
                  url={user.avatarUrl} 
                  size="xxl" 
                  className="w-32 h-32 md:w-32 md:h-32 border-4 border-white shadow-md text-3xl"
                />
              </div>
              
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-navy">{user.fullName}</h1>
                  {profile.verificationStatus === "VERIFIED" && (
                    <BadgeCheck className="w-6 h-6 text-yellow-500 fill-current" />
                  )}
                </div>
                <p className="text-lg text-gray-600 font-medium mb-2">{profile.headline || profile.profession}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-500">
                  {profile.country && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      {profile.city}, {profile.country}
                    </span>
                  )}
                  {languages.length > 0 && (
                     <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium">
                       {languages.join(", ")}
                     </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-blue-50 text-navy rounded-full mb-2">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-navy">{stat.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-navy">À Propos</h2>
              </div>
              <div className="p-6 text-gray-600 leading-relaxed whitespace-pre-wrap">
                {profile.bioLong || profile.bioShort || "Aucune description disponible."}
              </div>
            </div>

            {/* Expertise */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-navy">Domaines d'Expertise</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   {expertiseList.map((item, i) => (
                     <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors">
                        {getIconForExpertise(item)}
                        <span className="mt-2 text-sm font-medium text-navy">{item}</span>
                     </div>
                   ))}
                   {expertiseList.length === 0 && (
                     <p className="text-gray-400 text-center col-span-3">Non spécifié</p>
                   )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
             
             {/* Actions Card */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
               <h3 className="font-bold text-navy mb-4">Actions</h3>
               <div className="space-y-3">
                 <Button className="w-full justify-start gap-3 h-12 text-base" size="lg" asChild>
                    <Link href={`/marketplace/demande/nouveau?proId=${user.id}`}>
                        <Mail className="w-5 h-5" />
                        Contactez-moi
                    </Link>
                 </Button>

                 <Button variant="outline" className="w-full justify-start gap-3 h-12 text-base" onClick={() => {
                   // Trigger message logic
                   window.dispatchEvent(new CustomEvent("open-conversation", { 
                     detail: { conversationId: "new", partnerId: user.id } 
                   }));
                 }}>
                    <MessageSquare className="w-5 h-5" />
                    Envoyer un message
                 </Button>
                 
                 <Button variant="outline" className="w-full justify-start gap-3 h-12 text-base" asChild>
                    <a href={`mailto:${user.email}`}>
                        <Calendar className="w-5 h-5" />
                        Planifier un RDV
                    </a>
                 </Button>
               </div>

               <div className="mt-6 pt-6 border-t border-gray-100">
                 <h4 className="text-sm font-bold text-navy mb-3">Accréditations</h4>
                 <div className="flex gap-4 opacity-80">
                   {/* Placeholder logos */}
                   <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs">RCIC</div>
                   <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs">MIFI</div>
                 </div>
               </div>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// Helper to get icons based on keywords
function getIconForExpertise(label: string) {
  // Simple mapping
  if (label.toLowerCase().includes("étude")) return <span className="text-2xl">🎓</span>;
  if (label.toLowerCase().includes("travail")) return <span className="text-2xl">✈️</span>;
  if (label.toLowerCase().includes("famille")) return <span className="text-2xl">👨‍👩‍👧‍👦</span>;
  return <span className="text-2xl">🍁</span>;
}

