
import React, { useState, useRef } from 'react';
import { User, VerificationStatus, UserRole } from '../types';
import { 
  Settings, 
  Edit3, 
  Share, 
  BadgeCheck, 
  MapPin, 
  Calendar, 
  FileText, 
  Star, 
  Briefcase, 
  Globe, 
  Award, 
  Users, 
  Lock, 
  Bell, 
  Eye, 
  EyeOff, 
  Shield, 
  Activity, 
  LogOut,
  Mail,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

interface ProfileProps {
  user: User;
  onUpdateUser: (data: Partial<User>) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profil' | 'parametres'>('profil');
  const [isPublic, setIsPublic] = useState(user.isPublic);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'avatar') {
          onUpdateUser({ avatar: base64String });
        } else {
          onUpdateUser({ bannerUrl: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderProfileView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="md:col-span-2 space-y-10">
        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Biographie Institutionnelle
          </h3>
          <p className="text-slate-600 leading-relaxed font-medium">
            {user.bio || "Membre engagé au sein de l'écosystème Capitune Canada. Travaille sur des projets d'immigration et d'installation pour faciliter la mobilité vers les provinces canadiennes."}
          </p>
        </section>

        {user.role === UserRole.PROFESSIONNEL && (
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              Mes Réseaux Professionnels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Cercle CRIC Québec', role: 'Fondateur', members: 124 },
                { name: 'Experts Entrée Express', role: 'Membre', members: 450 }
              ].map((net, i) => (
                <div key={i} className="flex flex-col p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:border-purple-200 transition-all group cursor-pointer">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{net.name}</p>
                      <p className="text-[10px] text-purple-600 font-bold uppercase">{net.role}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{net.members} membres certifiés</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Historique d'Activité
          </h3>
          <div className="space-y-4">
            {[
              { action: "Inscription au webinaire IRCC", date: "Il y a 2 jours", type: "event" },
              { action: "Document 'Preuve de fonds' déposé", date: "Il y a 5 jours", type: "doc" },
              { action: "Profil mis à jour", date: "Il y a 1 semaine", type: "profile" }
            ].map((act, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                   <div className="w-2 h-2 rounded-full bg-purple-600" />
                </div>
                <div className="flex-1">
                   <p className="text-sm font-bold text-slate-800">{act.action}</p>
                   <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{act.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-8">
        <section className="bg-slate-900 text-white p-7 rounded-[32px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full -mr-12 -mt-12" />
          <h3 className="font-bold mb-6 flex items-center gap-2">Gouvernance du Compte</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Statut :</span>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${user.status === 'ACTIF' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {user.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Visibilité :</span>
              <span className="flex items-center gap-2 font-bold text-slate-200">
                {isPublic ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                {isPublic ? 'Public' : 'Privé'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Certifié :</span>
              <span className="font-bold text-slate-200">{user.verificationStatus === VerificationStatus.VERIFIED ? 'OUI' : 'EN COURS'}</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Informations Système</p>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-[10px] font-bold">
               ID-CAPITUNE: #88192-X
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-sm mb-6 uppercase tracking-widest">Spécialités Clés</h3>
          <div className="flex flex-wrap gap-2">
            {['Immigration', 'Permis Études', 'Visa Travail', 'CAQ'].map(tag => (
              <span key={tag} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 hover:border-purple-200 transition-colors cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-8">
        <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <UserIcon className="w-6 h-6 text-purple-600" />
            Informations Personnelles
          </h3>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nom complet</label>
              <input type="text" defaultValue={user.name} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email institutionnel</label>
              <input type="email" defaultValue={user.email} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Biographie</label>
              <textarea defaultValue={user.bio} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none transition-all font-bold text-slate-700 h-32 resize-none" />
            </div>
            <div className="md:col-span-2 pt-4">
              <button className="px-10 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-100 hover:scale-105 transition-all">
                Sauvegarder les modifications
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-600" />
            Sécurité & Accès
          </h3>
          <div className="space-y-6">
             <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white rounded-xl shadow-sm"><Lock className="w-5 h-5 text-slate-600" /></div>
                   <div>
                      <p className="text-sm font-bold text-slate-900">Mot de passe</p>
                      <p className="text-xs text-slate-400">Modifié il y a 3 mois</p>
                   </div>
                </div>
                <button className="px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Mettre à jour</button>
             </div>
             <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white rounded-xl shadow-sm"><Activity className="w-5 h-5 text-slate-600" /></div>
                   <div>
                      <p className="text-sm font-bold text-slate-900">Sessions actives</p>
                      <p className="text-xs text-slate-400">2 appareils connectés</p>
                   </div>
                </div>
                <button className="px-4 py-2 bg-white text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50">Tout déconnecter</button>
             </div>
          </div>
        </section>
      </div>

      <div className="space-y-8">
        <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Préférences de visibilité</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-black text-slate-900">Profil Public</p>
                 <p className="text-[10px] text-slate-500 font-medium">Visible dans l'annuaire des membres</p>
              </div>
              <button 
                onClick={() => setIsPublic(!isPublic)}
                className={`w-12 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-purple-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div>
                 <p className="text-sm font-black text-slate-900">Notifications Email</p>
                 <p className="text-[10px] text-slate-500 font-medium">Alertes de nouveaux messages</p>
              </div>
              <button className="w-12 h-6 bg-purple-600 rounded-full relative">
                <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
              </button>
            </div>
          </div>
        </section>

        <section className="p-8 bg-red-50 rounded-[32px] border border-red-100">
          <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4">Espace Danger</h3>
          <p className="text-xs text-red-500 mb-6 leading-relaxed font-medium">
            La suspension ou la suppression de votre compte est irréversible et entraîne la perte de tous vos dossiers.
          </p>
          <button className="w-full py-4 border-2 border-red-200 text-red-600 rounded-2xl font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" />
            Supprimer mon compte
          </button>
        </section>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <input 
        type="file" 
        ref={avatarInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'avatar')} 
      />
      <input 
        type="file" 
        ref={bannerInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'banner')} 
      />

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group/profile">
        <div className="h-56 relative overflow-hidden bg-slate-100">
          {user.bannerUrl ? (
            <img src={user.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full mauve-gradient" />
          )}
          
          <div className="absolute top-6 left-6 z-10">
            <button 
              onClick={() => bannerInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-md text-white rounded-xl text-xs font-bold hover:bg-black/50 transition-all border border-white/20"
            >
              <ImageIcon className="w-4 h-4" />
              Modifier la couverture
            </button>
          </div>

          <div className="absolute top-6 right-6 flex gap-2 z-10">
            <button className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition-all">
                <Share className="w-5 h-5" />
            </button>
            <button className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition-all">
                <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-10 pb-10">
          <div className="relative -mt-20 flex flex-col md:flex-row md:items-end gap-6 mb-8">
            <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <img src={user.avatar} className="w-36 h-36 rounded-[40px] border-8 border-white shadow-2xl object-cover bg-slate-100 transition-transform group-hover/avatar:scale-105" alt="Avatar" />
              
              <div className="absolute inset-0 bg-black/40 rounded-[40px] opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity border-8 border-transparent">
                <Camera className="w-8 h-8 text-white" />
              </div>

              {user.verificationStatus === VerificationStatus.VERIFIED && (
                 <div className="absolute -right-2 -bottom-2 bg-white p-1.5 rounded-full shadow-lg z-20">
                    <BadgeCheck className="w-10 h-10 text-blue-500 fill-blue-50" />
                 </div>
              )}
            </div>
            
            <div className="flex-1 space-y-1">
               <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-black text-slate-900">{user.name}</h1>
                 {user.badgeLevel && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase rounded-lg">Badge {user.badgeLevel}</span>
                 )}
               </div>
               <p className="text-purple-600 font-bold tracking-wide flex items-center gap-2 text-sm uppercase">
                 {user.role === UserRole.PROFESSIONNEL ? (user.specialty || 'Expert Canada') : 'Membre Demandeur'}
                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                 <span className="text-slate-500 font-medium normal-case">Membre depuis {new Date(user.joinedAt).getFullYear()}</span>
               </p>
            </div>
          </div>

          <div className="flex items-center gap-8 border-b border-slate-100 mb-10">
            <button 
              onClick={() => setActiveTab('profil')}
              className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'profil' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Mon Profil Public
              {activeTab === 'profil' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('parametres')}
              className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'parametres' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Paramètres du Compte
              {activeTab === 'parametres' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-full" />}
            </button>
          </div>

          {activeTab === 'profil' ? renderProfileView() : renderSettingsView()}
        </div>
      </div>
    </div>
  );
};

export default Profile;
