
import React, { useState } from 'react';
import { MOCK_USERS } from '../constants';
import { Search, Filter, MapPin, BadgeCheck, Star, MoreHorizontal, MessageCircle } from 'lucide-react';
import { UserRole, VerificationStatus } from '../types';

const Directory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // Use 'All' or UserRole enum as the type for the filter state
  const [activeFilter, setActiveFilter] = useState<'All' | UserRole>('All');

  const filteredUsers = MOCK_USERS.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
    // Comparing user.role (UserRole enum) with activeFilter (UserRole | 'All')
    const matchesFilter = activeFilter === 'All' || user.role === activeFilter;
    return matchesSearch && matchesFilter;
  });

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Annuaire des Membres</h1>
          <p className="text-slate-500">Découvrez et connectez-vous avec les acteurs de l'écosystème Capitune Canada.</p>
        </div>
        <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
           <button 
             onClick={() => setActiveFilter('All')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeFilter === 'All' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
           >Tous</button>
           <button 
             onClick={() => setActiveFilter(UserRole.PROFESSIONNEL)}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeFilter === UserRole.PROFESSIONNEL ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
           >Experts</button>
           <button 
             onClick={() => setActiveFilter(UserRole.PARTICULIER)}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeFilter === UserRole.PARTICULIER ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
           >Demandeurs</button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, spécialité, province..."
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm focus:ring-4 focus:ring-purple-50 focus:border-purple-200 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl hover:translate-y-[-4px] transition-all flex flex-col">
            <div className="relative h-28 mauve-gradient">
               <div className="absolute -bottom-10 left-6">
                 <img src={user.avatar} className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover bg-slate-100" alt="" />
                 {user.verificationStatus === VerificationStatus.VERIFIED && (
                   <div className="absolute -right-1 -bottom-1 bg-white p-0.5 rounded-full shadow-sm">
                     <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-50" />
                   </div>
                 )}
               </div>
            </div>
            <div className="pt-12 p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 line-clamp-1">{user.name}</h3>
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">{user.specialty || 'Demandeur'}</p>
                </div>
                {user.badgeLevel && (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest h-fit whitespace-nowrap ${getBadgeStyles(user.badgeLevel)}`}>
                    {user.badgeLevel}
                  </span>
                )}
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {user.location || user.targetProvince || 'Localisation non définie'}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    4.8
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium pl-5">
                    (12 avis)
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed h-10 mb-6 flex-1">
                {user.bio || 'Prêt pour son projet Canada avec Capitune.'}
              </p>

              <div className="flex items-center gap-3">
                <button className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-xs font-black hover:bg-purple-600 transition-all uppercase tracking-widest">
                  Profil
                </button>
                <button className="p-3 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-2xl transition-all">
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
    </div>
  );
};

export default Directory;
