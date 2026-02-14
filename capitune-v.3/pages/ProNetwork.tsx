
import React from 'react';
// Added missing Search and MapPin imports
import { Briefcase, Users, Link as LinkIcon, Globe, MessageSquare, Plus, ShieldCheck, Lock, Unlock, Search, MapPin } from 'lucide-react';
import { MOCK_USERS, MOCK_NETWORKS } from '../constants';
import { UserRole } from '../types';

const ProNetwork: React.FC = () => {
  const professionals = MOCK_USERS.filter(u => u.role === UserRole.PROFESSIONNEL);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Globe className="w-10 h-10 text-purple-600" />
            Écosystème des Experts
          </h1>
          <p className="text-slate-500 text-lg">Collaborez entre pairs certifiés CRIC pour offrir un service d'excellence.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-purple-600 shadow-xl transition-all">
            <Plus className="w-5 h-5" />
            Créer un Cercle Pro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar : Mes Groupes et Gouvernance */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Mes Réseaux Actifs</h3>
             <div className="space-y-4">
                {MOCK_NETWORKS.map((net) => (
                  <div key={net.id} className="group cursor-pointer p-4 bg-slate-50 rounded-2xl hover:bg-purple-50 transition-all border border-transparent hover:border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm">
                             <Users className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-purple-700">{net.name}</span>
                       </div>
                       {net.isPrivate ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">{net.recentActivity}</p>
                  </div>
                ))}
             </div>
             <button className="w-full mt-6 py-3 text-xs font-black text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                <Search className="w-4 h-4" />
                Explorer les cercles
             </button>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
             <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Déontologie Pro
             </h3>
             <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Le partage de dossiers clients entre experts doit respecter les normes de confidentialité CRIC.
             </p>
             <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                Guide de Co-traitance
             </button>
          </div>
        </div>

        {/* Feed Principal : Co-traitance et Partenariats */}
        <div className="lg:col-span-3 space-y-8">
           <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
               <div>
                 <h3 className="text-xl font-black text-slate-900">Membres Certifiés disponibles pour Collaboration</h3>
                 <p className="text-slate-500 text-sm mt-1">Établissez des partenariats stratégiques pour des dossiers multi-spécialités.</p>
               </div>
               <div className="flex items-center gap-2">
                 <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"><Users className="w-5 h-5" /></button>
                 <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"><Briefcase className="w-5 h-5" /></button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {professionals.map(pro => (
                 <div key={pro.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                    <div>
                      <div className="flex gap-4 mb-4">
                        <div className="relative">
                          <img src={pro.avatar} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" alt="" />
                          <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-slate-50 shadow-sm" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors">{pro.name}</h4>
                          <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">{pro.specialty}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${pro.badgeLevel === 'Or' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              Badge {pro.badgeLevel}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><MapPin className="w-3 h-3" /> {pro.location}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10 leading-relaxed font-medium">
                        {pro.bio || "Prêt à collaborer sur des projets d'immigration complexes ou des programmes d'études."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-200/50">
                      <button className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center justify-center gap-2">
                        Proposer un Dossier
                        <LinkIcon className="w-3 h-3" />
                      </button>
                      <button className="p-3 bg-white text-slate-900 border border-slate-100 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all shadow-sm">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                 </div>
               ))}
             </div>
           </section>
           
           <section className="bg-purple-900 text-white rounded-[40px] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
              <div className="flex-1 space-y-6 relative z-10">
                 <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/20 mb-4">
                    <MessageSquare className="w-8 h-8 text-purple-300" />
                 </div>
                 <h3 className="text-3xl font-black leading-tight">Salons de Discussion par Spécialité Professionnelle</h3>
                 <p className="text-purple-200 text-lg font-medium leading-relaxed max-w-lg">
                    Rejoignez les canaux exclusifs de discussion pour échanger en temps réel avec vos confrères sur les nouvelles directives gouvernementales.
                 </p>
                 <button className="px-10 py-4 bg-white text-purple-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-950 hover:scale-105 transition-all">
                    Entrer dans les Salons
                 </button>
              </div>
              <div className="flex -space-x-4 relative z-10">
                 {professionals.map((u, i) => (
                   <img key={u.id} src={u.avatar} className="w-16 h-16 rounded-2xl border-4 border-purple-900 shadow-2xl" style={{ opacity: 1 - (i * 0.15) }} alt="" />
                 ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default ProNetwork;
