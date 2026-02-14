
import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Users,
  Link as LinkIcon,
  Globe,
  MessageSquare,
  Plus,
  ShieldCheck,
  Lock,
  Unlock,
  Search,
  MapPin,
  X,
  Dot,
  MessagesSquare,
  Send,
  FileText,
} from 'lucide-react';
import { MOCK_USERS, MOCK_NETWORKS } from '../constants';
import { ProjectType, User, UserRole, VerificationStatus } from '../types';

type ProNetworkProps = {
  user: User;
};

type SalonId = 'mifi' | 'ircc' | 'express' | 'droit-travail' | 'etudes';

type Salon = {
  id: SalonId;
  name: string;
  description: string;
};

const SALONS: Salon[] = [
  { id: 'mifi', name: 'Salon MIFI', description: 'Directives Québec (PEQ, CAQ, exigences).' },
  { id: 'ircc', name: 'Salon IRCC', description: 'Politiques fédérales, mises à jour & tendances.' },
  { id: 'express', name: 'Salon Entrée Express', description: 'CRS, rondes, preuves de fonds & stratégies.' },
  { id: 'droit-travail', name: 'Salon Droit du Travail', description: 'LMIA, permis de travail, mobilité.' },
  { id: 'etudes', name: 'Salon Études', description: 'Admissions, permis d’études, conformité.' },
];

function specialtyLabel(s?: ProjectType) {
  if (!s) return '';
  return s;
}

function badgeStyle(level?: 'Bronze' | 'Argent' | 'Or') {
  if (level === 'Or') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (level === 'Argent') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (level === 'Bronze') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

const ProNetwork: React.FC<ProNetworkProps> = ({ user }) => {
  const [networks, setNetworks] = useState(() => MOCK_NETWORKS);
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [circleCategory, setCircleCategory] = useState<ProjectType>(ProjectType.IMMIGRATION);
  const [circleIsPrivate, setCircleIsPrivate] = useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSalonsOpen, setIsSalonsOpen] = useState(false);
  const [activeSalonId, setActiveSalonId] = useState<SalonId>('mifi');

  const [activeChatProId, setActiveChatProId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');

  const [activeCaseProposeId, setActiveCaseProposeId] = useState<string | null>(null);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState<ProjectType>(ProjectType.IMMIGRATION);
  const [caseNote, setCaseNote] = useState('');

  const professionals = useMemo(
    () =>
      MOCK_USERS.filter(
        (u) => u.role === UserRole.PROFESSIONNEL && u.verificationStatus === VerificationStatus.VERIFIED,
      ),
    [],
  );

  const isAllowed = user.role === UserRole.PROFESSIONNEL || user.role === UserRole.ADMIN;

  const onlineById = useMemo(() => {
    // Simulation stable: alterne online/offline par id.
    const map = new Map<string, boolean>();
    professionals.forEach((p) => {
      const lastChar = p.id.slice(-1);
      const digit = Number(lastChar);
      map.set(p.id, Number.isFinite(digit) ? digit % 2 === 1 : p.id.length % 2 === 1);
    });
    return map;
  }, [professionals]);

  const activeChatPro = professionals.find((p) => p.id === activeChatProId) ?? null;
  const activeCaseProposePro = professionals.find((p) => p.id === activeCaseProposeId) ?? null;

  const activeSalon = SALONS.find((s) => s.id === activeSalonId) ?? SALONS[0]!;

  const closeOverlays = () => {
    setIsSalonsOpen(false);
    setActiveChatProId(null);
    setActiveCaseProposeId(null);
  };

  const startCreateCircle = () => {
    setCircleName('');
    setCircleDescription('');
    setCircleCategory(ProjectType.IMMIGRATION);
    setCircleIsPrivate(true);
    setIsCreateCircleOpen(true);
  };

  const submitCreateCircle = () => {
    const name = circleName.trim();
    const description = circleDescription.trim();
    if (!name) return;

    const newCircle = {
      id: `net-${Date.now()}`,
      name,
      description: description || 'Cercle professionnel privé pour échanges confidentiels.',
      memberCount: 1,
      category: circleCategory,
      creatorId: user.id,
      isPrivate: circleIsPrivate,
      recentActivity: 'Cercle créé à l’instant.',
    };

    setNetworks((prev) => [newCircle, ...prev]);
    setIsCreateCircleOpen(false);
    setIsMobileMenuOpen(true);
  };

  const sendMessage = () => {
    const msg = draftMessage.trim();
    if (!msg) return;
    // Simulé: on efface, sans persistance.
    setDraftMessage('');
  };

  const submitCaseProposal = () => {
    // Simulé: on ferme et reset.
    setActiveCaseProposeId(null);
    setCaseTitle('');
    setCaseCategory(ProjectType.IMMIGRATION);
    setCaseNote('');
  };

  if (!isAllowed) {
    return (
      <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Accès restreint</h1>
              <p className="text-slate-500 text-sm mt-1">
                Le Réseau Pro est réservé aux Experts certifiés et aux Administrateurs.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            className="md:hidden flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-900 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
            title="Ouvrir le menu des cercles"
          >
            <Users className="w-5 h-5 text-slate-500" />
            Mes Cercles
          </button>
          <button
            type="button"
            onClick={startCreateCircle}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-purple-600 shadow-xl transition-all"
            title="Créer un cercle professionnel"
          >
            <Plus className="w-5 h-5" />
            Créer un Cercle Pro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar : Mes Groupes et Gouvernance */}
        <div className={`space-y-6 ${isMobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Mes Réseaux Actifs</h3>
             <div className="space-y-4">
                {networks.map((net) => (
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
                 <button title="Vue membres" className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"><Users className="w-5 h-5" /></button>
                 <button title="Vue dossiers" className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"><Briefcase className="w-5 h-5" /></button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {professionals.map(pro => (
                 <div key={pro.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                    <div>
                      <div className="flex gap-4 mb-4">
                        <div className="relative">
                          <img src={pro.avatar} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" alt="" />
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-50 shadow-sm ${
                              onlineById.get(pro.id) ? 'bg-green-500' : 'bg-slate-300'
                            }`}
                            title={onlineById.get(pro.id) ? 'Disponible' : 'Indisponible'}
                          />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors">{pro.name}</h4>
                          <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">{specialtyLabel(pro.specialty)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${badgeStyle(pro.badgeLevel)}`}>
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
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCaseProposeId(pro.id);
                          setCaseTitle('');
                          setCaseCategory(ProjectType.IMMIGRATION);
                          setCaseNote('');
                        }}
                        className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
                        title="Proposer un dossier (simulation)"
                      >
                        Proposer un Dossier
                        <LinkIcon className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveChatProId(pro.id)}
                        className="p-3 bg-white text-slate-900 border border-slate-100 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all shadow-sm"
                        title="Messagerie instantanée B2B"
                      >
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
                 <button
                    type="button"
                    onClick={() => setIsSalonsOpen(true)}
                    className="px-10 py-4 bg-white text-purple-900 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-950 hover:scale-105 transition-all"
                    title="Entrer dans les salons"
                 >
                    Entrer dans les Salons
                 </button>
              </div>
              <div className="flex -space-x-4 relative z-10">
                 {professionals.map((u, i) => {
                   const opacityClass = i === 0 ? 'opacity-100' : i === 1 ? 'opacity-85' : i === 2 ? 'opacity-70' : 'opacity-55';
                   return (
                     <img
                       key={u.id}
                       src={u.avatar}
                       className={`w-16 h-16 rounded-2xl border-4 border-purple-900 shadow-2xl ${opacityClass}`}
                       alt=""
                     />
                   );
                 })}
              </div>
           </section>
        </div>
      </div>

      {/* Overlay Salons / Chat / Co-traitance */}
      {(isSalonsOpen || activeChatProId || activeCaseProposeId) && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeOverlays();
          }}
        >
          <div className="bg-white w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                  {activeCaseProposeId ? <FileText className="w-5 h-5" /> : activeChatProId ? <MessagesSquare className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {activeCaseProposeId ? 'Co-traitance' : activeChatProId ? 'Messagerie B2B' : 'Salons en temps réel'}
                  </p>
                  <h4 className="text-lg font-black text-slate-900">
                    {activeCaseProposePro
                      ? `Proposer un dossier à ${activeCaseProposePro.name}`
                      : activeChatPro
                        ? `Conversation avec ${activeChatPro.name}`
                        : activeSalon.name}
                  </h4>
                </div>
              </div>
              <button type="button" onClick={closeOverlays} className="p-2 rounded-xl hover:bg-slate-50" title="Fermer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Liste salons (uniquement si salons ouverts) */}
              <div className={`${activeChatProId || activeCaseProposeId ? 'hidden' : 'block'} lg:col-span-2 border-r border-slate-100 bg-slate-50 p-6 space-y-3`}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salons</p>
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Exclusif Experts</span>
                </div>
                {SALONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSalonId(s.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      s.id === activeSalonId ? 'bg-white border-purple-100 shadow-sm' : 'bg-white/60 border-slate-100 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Dot className={`w-6 h-6 ${s.id === activeSalonId ? 'text-purple-600' : 'text-slate-300'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{s.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium leading-snug mt-1">{s.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Corps */}
              <div className={`${activeChatProId || activeCaseProposeId ? 'block' : 'block'} lg:col-span-3 p-6`}> 
                {activeCaseProposeId && activeCaseProposePro && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rappel gouvernance</p>
                      <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                        Fonction simulée. Tout partage de données client doit respecter la confidentialité et la déontologie CRIC.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre du dossier</label>
                        <input
                          value={caseTitle}
                          onChange={(e) => setCaseTitle(e.target.value)}
                          placeholder="Ex: Dossier complexe multi-provinces"
                          className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spécialité</label>
                        <select
                          value={caseCategory}
                          onChange={(e) => setCaseCategory(e.target.value as ProjectType)}
                          title="Catégorie du dossier"
                          className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                        >
                          <option value={ProjectType.IMMIGRATION}>Immigration</option>
                          <option value={ProjectType.ETUDES}>Études</option>
                          <option value={ProjectType.TRAVAIL}>Travail</option>
                          <option value={ProjectType.INSTALLATION}>Installation</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Note de co-traitance</label>
                      <textarea
                        value={caseNote}
                        onChange={(e) => setCaseNote(e.target.value)}
                        placeholder="Résumé du besoin, contraintes, échéances, pièces requises (sans données sensibles)."
                        className="w-full min-h-[120px] px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={submitCaseProposal}
                        className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-100"
                      >
                        Envoyer la proposition
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCaseProposeId(null)}
                        className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {activeChatProId && activeChatPro && (
                  <div className="h-[520px] flex flex-col">
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-3xl p-5 overflow-auto">
                      <div className="flex items-start gap-3">
                        <img src={activeChatPro.avatar} className="w-10 h-10 rounded-2xl object-cover" alt="" />
                        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm max-w-[420px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeChatPro.name}</p>
                          <p className="text-sm text-slate-700 font-medium mt-1">
                            Bonjour — discussion B2B simulée. Tu peux négocier une co-traitance et t’aligner sur le cadre de gouvernance.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <input
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        placeholder="Écrire un message..."
                        className="flex-1 px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-purple-600 transition-all flex items-center gap-2"
                      >
                        Envoyer
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!activeChatProId && !activeCaseProposeId && (
                  <div className="h-[520px] flex flex-col">
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-3xl p-5 overflow-auto">
                      <div className="space-y-4">
                        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm max-w-[520px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gouvernance</p>
                          <p className="text-sm text-slate-700 font-medium mt-1">
                            Salon simulé — partagez des veilles, sans données client. Seuls les profils CERTIFIE_CRIC sont listés.
                          </p>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm max-w-[520px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeSalon.name}</p>
                          <p className="text-sm text-slate-700 font-medium mt-1">{activeSalon.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <input
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        placeholder={`Message dans ${activeSalon.name}...`}
                        className="flex-1 px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        className="px-6 py-3.5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-2"
                        title="Envoyer (simulation)"
                      >
                        Poster
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Cercle */}
      {isCreateCircleOpen && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateCircleOpen(false);
          }}
        >
          <div className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cercles professionnels</p>
                  <h4 className="text-lg font-black text-slate-900">Créer un Cercle Pro</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCircleOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50"
                title="Fermer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom du cercle</label>
                  <input
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    placeholder="Ex: Consultants CRIC - Montréal"
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                  <select
                    value={circleCategory}
                    onChange={(e) => setCircleCategory(e.target.value as ProjectType)}
                    title="Catégorie du cercle"
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                  >
                    <option value={ProjectType.IMMIGRATION}>Immigration</option>
                    <option value={ProjectType.ETUDES}>Études</option>
                    <option value={ProjectType.TRAVAIL}>Travail</option>
                    <option value={ProjectType.INSTALLATION}>Installation</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={circleDescription}
                  onChange={(e) => setCircleDescription(e.target.value)}
                  placeholder="Objet du cercle, règles de confidentialité, sujets..."
                  className="w-full min-h-[120px] px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <input
                  type="checkbox"
                  checked={circleIsPrivate}
                  onChange={(e) => setCircleIsPrivate(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  id="circle-private"
                />
                <label htmlFor="circle-private" className="text-sm text-slate-600 font-medium leading-relaxed cursor-pointer">
                  Cercle fermé (recommandé) — accès uniquement sur invitation.
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={submitCreateCircle}
                  disabled={!circleName.trim()}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${
                    circleName.trim() ? 'bg-purple-600 text-white shadow-purple-100 hover:scale-[1.01]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Créer le cercle
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateCircleOpen(false)}
                  className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProNetwork;
