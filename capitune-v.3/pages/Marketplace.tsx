
import React, { useState } from 'react';
import { User, UserRole, ProjectType } from '../types';
import { MOCK_REQUESTS, MOCK_USERS } from '../constants';
import { 
  FileText, 
  Search, 
  Plus, 
  Clock, 
  ArrowRight, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen,
  MessageSquare,
  Users
} from 'lucide-react';

interface MarketplaceProps {
  user: User;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user }) => {
  const [filter, setFilter] = useState('All');

  const userDossiers = user.role === UserRole.PARTICULIER 
    ? MOCK_REQUESTS.filter(r => r.requesterId === user.id)
    : user.role === UserRole.PROFESSIONNEL
      ? MOCK_REQUESTS.filter(r => r.expertId === user.id)
      : MOCK_REQUESTS;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <FolderOpen className="w-10 h-10 text-purple-600" />
            Espace Dossiers Canada
          </h1>
          <p className="text-slate-500 text-lg">Suivez l'avancement de vos démarches et collaborez avec vos experts.</p>
        </div>
        {user.role === UserRole.PARTICULIER && (
          <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-100 hover:scale-105 transition-all">
            <Plus className="w-5 h-5" />
            Nouveau Dossier
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex-1 relative min-w-[250px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Rechercher par numéro de dossier..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-200 transition-all" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['All', ...Object.values(ProjectType)].map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilter(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === cat ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {cat === 'All' ? 'Tous les types' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {userDossiers.map(req => {
          const expert = req.expertId ? MOCK_USERS.find(u => u.id === req.expertId) : null;
          const requester = MOCK_USERS.find(u => u.id === req.requesterId);

          return (
            <div key={req.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-50 rounded-full -mr-24 -mt-24 group-hover:bg-purple-100 transition-colors" />
              
              <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-black rounded-full uppercase tracking-widest">{req.category}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">ID: #CAP-{req.id}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">{req.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm max-w-2xl">{req.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pièces Jointes</p>
                      <div className="space-y-2">
                        {req.documents?.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-600" />
                              <span className="font-bold text-slate-700 truncate max-w-[120px]">{doc.name}</span>
                            </div>
                            {doc.status === 'VALIDATED' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        {user.role === UserRole.PARTICULIER ? 'Expert Référent' : 'Demandeur'}
                      </p>
                      <div className="flex items-center gap-3">
                        <img src={user.role === UserRole.PARTICULIER ? expert?.avatar : requester?.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm border-2 border-white" alt="" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user.role === UserRole.PARTICULIER ? expert?.name : requester?.name}</p>
                          <p className="text-[10px] text-purple-600 font-bold uppercase">Membre vérifié</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:w-80 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-8 lg:pt-0 lg:pl-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">État de l'Engagement</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-xs font-black uppercase tracking-widest">{req.status}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Coût Estimé</p>
                      <p className="text-3xl font-black text-slate-900">{req.budget || 'Sur devis'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-10 space-y-3">
                    <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-purple-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-100">
                      Ouvrir le Dossier
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button className="w-full bg-purple-50 text-purple-700 py-4 rounded-2xl font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-3">
                      <MessageSquare className="w-5 h-5" />
                      Messagerie
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {userDossiers.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Vous n'avez aucun dossier actif pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
