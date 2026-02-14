
import React from 'react';
import { ShieldCheck, Users, Activity, AlertCircle, CheckCircle2, XCircle, Search, Filter, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const data = [
  { name: 'Jan', users: 400, pro: 240 },
  { name: 'Feb', users: 300, pro: 139 },
  { name: 'Mar', users: 200, pro: 980 },
  { name: 'Apr', users: 278, pro: 390 },
  { name: 'May', users: 189, pro: 480 },
];

const Admin: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
            Gouvernance & Administration
          </h1>
          <p className="text-slate-500">Supervisez l'écosystème, validez les certifications et analysez les flux.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Exporter rapports
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Utilisateurs Totaux', value: '3,482', change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pros Certifiés', value: '1,120', change: '+5%', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Alertes Modération', value: '14', change: '-2', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Activité Plateforme', value: '98%', change: '+1%', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                   {stat.change}
                </span>
             </div>
             <p className="text-3xl font-black text-slate-900">{stat.value}</p>
             <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Évolution des Inscriptions</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="users" stroke="#7c3aed" strokeWidth={3} dot={{r: 4, fill: '#7c3aed'}} />
                <Line type="monotone" dataKey="pro" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Demandes de Certification</h3>
            <button className="text-sm font-bold text-purple-600 hover:underline">Voir tout</button>
          </div>
          <div className="flex-1 space-y-4">
            {[
              { name: 'Sarah Connor', specialty: 'Ingénieure Cyber', date: 'Aujourd\'hui', status: 'En attente' },
              { name: 'Bruce Wayne', specialty: 'Gestionnaire Patrimoine', date: 'Hier', status: 'Urgent' },
              { name: 'Diana Prince', specialty: 'Experte Juridique', date: '18 Mai', status: 'En attente' },
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center font-bold text-purple-700">
                  {req.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{req.name}</p>
                  <p className="text-xs text-slate-500 truncate">{req.specialty}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-[10px] text-slate-400 font-medium">{req.date}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${req.status === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Journal des Actions</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Rechercher logs..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            </div>
            <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
              <Filter className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cible</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors text-sm">
                  <td className="px-6 py-4 font-bold text-slate-700">Modérateur #04</td>
                  <td className="px-6 py-4">Validation de profil</td>
                  <td className="px-6 py-4 text-slate-500">Jean Dupont (ID: 1024)</td>
                  <td className="px-6 py-4 text-right text-slate-400">19/05/2024 14:32</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
