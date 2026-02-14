
import React, { useMemo, useState } from 'react';
import { MOCK_USERS } from '../constants';
import { Search, MapPin, ShieldCheck, Star, MessageCircle, X } from 'lucide-react';
import { User, UserRole, VerificationStatus } from '../types';

const Directory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState<'ALL' | 'EXPERTS' | 'DEMANDEURS'>('ALL');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  const activeProfile = useMemo<User | null>(() => {
    if (!activeProfileId) return null;
    return MOCK_USERS.find((u) => u.id === activeProfileId) ?? null;
  }, [activeProfileId]);

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter((user) => {
      const specialtyLabel = user.specialty ? String(user.specialty) : '';
      const locationLabel = user.location || user.targetProvince || '';
      const haystack = `${user.name} ${specialtyLabel} ${locationLabel}`.toLowerCase();
      const matchesSearch = !normalizedQuery || haystack.includes(normalizedQuery);

      const isExpertCertified =
        user.role === UserRole.PROFESSIONNEL && user.verificationStatus === VerificationStatus.VERIFIED;

      const matchesSegment =
        activeSegment === 'ALL' ||
        (activeSegment === 'EXPERTS' && isExpertCertified) ||
        (activeSegment === 'DEMANDEURS' && user.role === UserRole.PARTICULIER);

      return matchesSearch && matchesSegment;
    });
  }, [activeSegment, normalizedQuery]);

  const getBadgeStyles = (level?: 'Bronze' | 'Argent' | 'Or') => {
    switch (level) {
      case 'Or':
        return 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm';
      case 'Argent':
        return 'bg-slate-100 text-slate-600 border border-slate-200 shadow-sm';
      case 'Bronze':
        return 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm';
      default:
        return 'bg-slate-50 text-slate-400 border border-slate-100';
    }
  };

  const getVerificationPill = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return {
          label: 'CERTIFIÉ CRIC',
          className: 'bg-blue-50 text-blue-700 border border-blue-100',
        };
      case VerificationStatus.PENDING:
        return {
          label: 'EN ATTENTE',
          className: 'bg-amber-50 text-amber-700 border border-amber-100',
        };
      case VerificationStatus.UNVERIFIED:
      default:
        return {
          label: 'NON VÉRIFIÉ',
          className: 'bg-slate-50 text-slate-600 border border-slate-100',
        };
    }
  };

  const getReputation = (user: User) => {
    if (user.role !== UserRole.PROFESSIONNEL) return null;

    if (user.verificationStatus !== VerificationStatus.VERIFIED) {
      return { rating: 4.4, count: 4 };
    }
    switch (user.badgeLevel) {
      case 'Or':
        return { rating: 4.9, count: 42 };
      case 'Argent':
        return { rating: 4.8, count: 18 };
      case 'Bronze':
        return { rating: 4.6, count: 9 };
      default:
        return { rating: 4.7, count: 12 };
    }
  };

  const openChatWith = (participantId: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('capitune:v3:open-chat', {
        detail: { participantId },
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Annuaire des Experts</h1>
          <p className="text-slate-500">Le moteur de recherche social et professionnel de Capitune (Experts certifiés & communauté).</p>
        </div>
        <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
           <button 
             onClick={() => setActiveSegment('ALL')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSegment === 'ALL' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
           >Tous</button>
           <button 
             onClick={() => setActiveSegment('EXPERTS')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSegment === 'EXPERTS' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
           >Experts</button>
           <button 
             onClick={() => setActiveSegment('DEMANDEURS')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSegment === 'DEMANDEURS' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
           >Demandeurs</button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Recherche live: nom, spécialité (Immigration, Études...), localisation (Montréal...)"
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm focus:ring-4 focus:ring-purple-50 focus:border-purple-200 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white/75 backdrop-blur-xl rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl hover:translate-y-[-4px] transition-all flex flex-col">
            <div className="relative h-28 mauve-gradient">
               <div className="absolute -bottom-10 left-6">
                 <img src={user.avatar} className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover bg-slate-100" alt="" />
                 {user.verificationStatus === VerificationStatus.VERIFIED && user.role === UserRole.PROFESSIONNEL && (
                   <div className="absolute -right-1 -bottom-1 bg-white p-0.5 rounded-full shadow-sm">
                     <ShieldCheck className="w-6 h-6 text-blue-600 fill-blue-50" />
                   </div>
                 )}
               </div>
            </div>
            <div className="pt-12 p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 line-clamp-1">{user.name}</h3>
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">{user.role === UserRole.PROFESSIONNEL ? (user.specialty || 'Expert') : 'Demandeur'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest h-fit whitespace-nowrap ${getVerificationPill(user.verificationStatus).className}`}>
                    {getVerificationPill(user.verificationStatus).label}
                  </span>
                  {user.badgeLevel && user.role === UserRole.PROFESSIONNEL && (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest h-fit whitespace-nowrap ${getBadgeStyles(user.badgeLevel)}`}>
                      {user.badgeLevel}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {user.location || user.targetProvince || 'Localisation non définie'}
                </div>
                {getReputation(user) && (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {getReputation(user)!.rating.toFixed(1)}/5
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium pl-5">
                      ({getReputation(user)!.count} avis)
                    </div>
                  </div>
                )}
              </div>

              <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed h-10 mb-6 flex-1">
                {user.bio || 'Prêt pour son projet Canada avec Capitune.'}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveProfileId(user.id)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-xs font-black hover:bg-purple-600 transition-all uppercase tracking-widest"
                >
                  Profil
                </button>
                <button
                  onClick={() => openChatWith(user.id)}
                  className="p-3 bg-purple-600 text-white hover:bg-purple-700 rounded-2xl transition-all shadow-lg shadow-purple-100"
                  title="Messagerie"
                  aria-label={`Messagerie avec ${user.name}`}
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold">Aucun membre ne correspond à votre recherche.</p>
        </div>
      )}

      {activeProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveProfileId(null)}
            aria-label="Fermer"
          />

          <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden">
            <div className="relative h-36 mauve-gradient">
              <button
                onClick={() => setActiveProfileId(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 text-white hover:bg-white/30 rounded-2xl transition-colors"
                aria-label="Fermer la fiche"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute -bottom-10 left-6 flex items-end gap-4">
                <div className="relative">
                  <img
                    src={activeProfile.avatar}
                    className="w-24 h-24 rounded-3xl border-4 border-white shadow-lg object-cover bg-slate-100"
                    alt=""
                  />
                  {activeProfile.verificationStatus === VerificationStatus.VERIFIED && activeProfile.role === UserRole.PROFESSIONNEL && (
                    <div className="absolute -right-1 -bottom-1 bg-white p-0.5 rounded-full shadow-sm">
                      <ShieldCheck className="w-7 h-7 text-blue-600 fill-blue-50" />
                    </div>
                  )}
                </div>

                <div className="pb-3">
                  <h2 className="text-2xl font-black text-white drop-shadow-sm">{activeProfile.name}</h2>
                  <p className="text-xs text-purple-50/90 font-black uppercase tracking-widest">
                    {activeProfile.role === UserRole.PROFESSIONNEL
                      ? `Expert • ${activeProfile.specialty ?? 'Spécialité'}`
                      : 'Demandeur • Membre de la communauté'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-16 p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest ${getVerificationPill(activeProfile.verificationStatus).className}`}>
                    {getVerificationPill(activeProfile.verificationStatus).label}
                  </span>
                  {activeProfile.badgeLevel && activeProfile.role === UserRole.PROFESSIONNEL && (
                    <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest ${getBadgeStyles(activeProfile.badgeLevel)}`}>
                      Distinction {activeProfile.badgeLevel}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-100">
                    <MapPin className="inline-block w-3.5 h-3.5 mr-1" />
                    {activeProfile.location || activeProfile.targetProvince || 'Localisation'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openChatWith(activeProfile.id)}
                    className="px-5 py-3 bg-purple-600 text-white rounded-2xl text-xs font-black hover:bg-purple-700 transition-all uppercase tracking-widest shadow-lg shadow-purple-100"
                  >
                    Messagerie
                  </button>
                </div>
              </div>

              {getReputation(activeProfile) && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Score de réputation</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <p className="text-lg font-black text-slate-900">
                      {getReputation(activeProfile)!.rating.toFixed(1)}/5
                    </p>
                    <p className="text-sm text-slate-500 font-bold">({getReputation(activeProfile)!.count} avis)</p>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Biographie</p>
                <p className="mt-2 text-slate-600 font-medium leading-relaxed">
                  {activeProfile.bio || 'Aucune biographie renseignée.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Historique</p>
                  <p className="mt-2 text-sm text-slate-500 font-medium">Vue détaillée disponible prochainement (MVP).</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Publications</p>
                  <p className="mt-2 text-sm text-slate-500 font-medium">Aucune publication à afficher pour le moment.</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Réseaux</p>
                  <p className="mt-2 text-sm text-slate-500 font-medium">Accès aux cercles et salons via l’onglet Réseau Pro.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Directory;
