import React from 'react';
import { User, UserRole, ProjectType, VerificationStatus } from '../types.ts';
import { 
  Briefcase, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Star,
  Zap,
  ShieldAlert,
  FileText,
  MapPin,
  Users,
  Search,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Award,
  Link as LinkIcon,
  Headphones,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { MOCK_EVENTS, MOCK_REQUESTS, MOCK_USERS } from '../constants.tsx';

interface DashboardProps {
  user: User;
  navigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, navigate }) => {
  const renderDemandeurDashboard = () => {
    const myDossier = MOCK_REQUESTS.find(r => r.requesterId === user.id);
    const assignedExpert = myDossier?.expertId ? MOCK_USERS.find(u => u.id === myDossier.expertId) : null;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="mauve-gradient rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full w-fit text-[10px] font-bold uppercase tracking-widest">
              <MapPin className="w-3 h-3" /> Espace Demandeur - Capitune Canada
            </div>
            <h1 className="text-4xl font-black">Bienvenue dans votre projet, {user.name}</h1>
            <p className="text-purple-100 max-w-xl text-lg font-medium">Votre écosystème sécurisé pour réussir votre installation au Canada avec des experts certifiés.</p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button onClick={() => navigate('directory')} className="px-8 py-3.5 bg-white text-purple-700 rounded-2xl font-bold shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                Trouver un Expert Certifié
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {assignedExpert && (
              <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-purple-600" /> Mon Expert Assigné
                </h3>
                <div className="flex items-center gap-6">
                  <img src={assignedExpert.avatar} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" alt="" />
                  <div>
                    <h4 className="text-xl font-black text-slate-900">{assignedExpert.name}</h4>
                    <p className="text-sm font-bold text-purple-600 uppercase tracking-widest">{assignedExpert.specialty}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  };

  switch (user.role) {
    case UserRole.ADMIN: return <div className="p-8">Admin Dashboard</div>;
    case UserRole.PROFESSIONNEL: return <div className="p-8">Expert Dashboard</div>;
    default: return renderDemandeurDashboard();
  }
};

export default Dashboard;