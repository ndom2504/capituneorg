
import React, { useState, useRef, useEffect } from 'react';
import { MOCK_EVENTS, MOCK_USERS } from '../constants';
import { UserRole, EventStatus, Event as EventType, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Calendar, Video, PlayCircle, Users, Clock, Search, Filter, 
  CheckCircle, Plus, Info, X, Layout, Settings, PieChart, 
  MoreVertical, Edit2, Eye, Trash2, DollarSign, Link as LinkIcon, 
  ImageIcon, Upload, Globe, ExternalLink, Sparkles, Loader2, AlertCircle,
  Ticket, QrCode, CreditCard, ArrowRight, CheckCircle2, FileText, Receipt,
  Lock, Wallet, ShieldCheck, CreditCard as CardIcon, Building2, Banknote,
  Download, History, RefreshCw, Smartphone, Scale, TrendingUp, Percent,
  // Added missing 'Briefcase' icon import
  Briefcase
} from 'lucide-react';

interface EventsProps {
  user: User;
}

const Events: React.FC<EventsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Replays' | 'Manage' | 'MyRegistrations'>('Upcoming');
  const [events, setEvents] = useState<EventType[]>(MOCK_EVENTS);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set(['e1']));
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // États de paiement Capitune Pay
  const [paymentStep, setPaymentStep] = useState<'summary' | 'method' | 'processing' | 'success' | null>(null);
  const [processingSubStep, setProcessingSubStep] = useState(0);
  const [activePaymentEvent, setActivePaymentEvent] = useState<EventType | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wallet' | 'credits'>('card');
  const [showTicketModal, setShowTicketModal] = useState<EventType | null>(null);
  const [showLegalPolicy, setShowLegalPolicy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [isAiLoading, setIsAiLoading] = useState<{title?: boolean, desc?: boolean}>({});
  const [aiError, setAiError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPro = user.role === UserRole.PROFESSIONNEL || user.role === UserRole.ADMIN;

  // Calculs financiers
  const COMMISSION_RATE = 0.10; // 10% pour Capitune
  const TAX_RATE = 0.14975; // TPS/TVQ (QC)

  const handleRegistration = (event: EventType) => {
    if (registeredIds.has(event.id)) {
      setShowTicketModal(event);
      return;
    }

    if (event.isPaid) {
      setActivePaymentEvent(event);
      setPaymentStep('summary');
      setAcceptTerms(false);
    } else {
      confirmRegistration(event.id);
    }
  };

  const startPaymentProcessing = () => {
    if (!acceptTerms) return;
    setPaymentStep('processing');
    setProcessingSubStep(0);
    
    const steps = [
      "Connexion sécurisée à Export Monde Prestige Inc...", 
      "Calcul des répartitions (Expert 90% / Capitune 10%)...", 
      "Finalisation de la transaction institutionnelle..."
    ];
    
    steps.forEach((_, index) => {
      setTimeout(() => {
        setProcessingSubStep(index + 1);
        if (index === steps.length - 1) {
          setTimeout(() => {
            setPaymentStep('success');
            if (activePaymentEvent) {
              setRegisteredIds(prev => new Set(prev).add(activePaymentEvent.id));
              setEvents(prev => prev.map(e => e.id === activePaymentEvent.id ? { ...e, registeredCount: e.registeredCount + 1 } : e));
            }
          }, 800);
        }
      }, (index + 1) * 1000);
    });
  };

  const confirmRegistration = (eventId: string) => {
    setRegisteredIds(prev => new Set(prev).add(eventId));
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, registeredCount: e.registeredCount + 1 } : e));
    const event = events.find(e => e.id === eventId);
    if (event) setShowTicketModal(event);
  };

  const filteredEvents = events.filter(event => {
    let matchesTab = true;
    if (activeTab === 'Upcoming') matchesTab = event.status === EventStatus.PUBLISHED || event.status === EventStatus.LIVE;
    else if (activeTab === 'Replays') matchesTab = event.status === EventStatus.REPLAY;
    else if (activeTab === 'MyRegistrations') matchesTab = registeredIds.has(event.id);
    
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const generateWithAi = async (field: 'title' | 'description') => {
    setAiError(null);
    setIsAiLoading(prev => ({ ...prev, [field]: true }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = field === 'title' 
        ? "Génère un titre percutant pour un webinaire sur l'immigration au Canada."
        : "Génère une description courte pour un webinaire sur l'immigration au Canada.";
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      console.log(response.text);
    } catch (e) {
      setAiError("Erreur IA");
    } finally {
      setIsAiLoading(prev => ({ ...prev, [field]: false }));
    }
  };

  // Calculs pour le tableau de bord Expert
  const totalGrossRevenue = events.reduce((acc, e) => acc + (e.isPaid ? (e.price || 0) * e.registeredCount : 0), 0);
  const totalCapituneCommission = totalGrossRevenue * COMMISSION_RATE;
  const totalNetRevenue = totalGrossRevenue * (1 - COMMISSION_RATE);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
            <Calendar className="w-6 h-6 text-purple-600" />
            Événements & Webinaires
          </h1>
          <p className="text-slate-500 text-sm font-medium">Gestion financière Export Monde Prestige Inc.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-0.5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar">
             <button onClick={() => setActiveTab('Upcoming')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'Upcoming' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>À venir</button>
             <button onClick={() => setActiveTab('MyRegistrations')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'MyRegistrations' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Mes Pass ({registeredIds.size})</button>
             <button onClick={() => setActiveTab('Replays')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'Replays' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>Replays</button>
             {isPro && (
               <button onClick={() => setActiveTab('Manage')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'Manage' ? 'bg-slate-900 text-white' : 'text-slate-500 border-l border-slate-100'}`}>
                 <Layout className="w-3.5 h-3.5 inline mr-1" /> Console Expert
               </button>
             )}
          </div>
          {isPro && activeTab === 'Manage' && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100 hover:scale-105 transition-all">
              <Plus className="w-4 h-4" /> Nouveau Webinaire
            </button>
          )}
        </div>
      </div>

      {activeTab === 'Manage' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Statistiques Financières Détaillées (10/90) */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-4"><DollarSign className="w-5 h-5" /></div>
                 <p className="text-2xl font-black text-slate-900">{totalGrossRevenue.toFixed(2)}$</p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Revenus Bruts</p>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm border-l-4 border-l-purple-600">
                 <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4"><Percent className="w-5 h-5" /></div>
                 <p className="text-2xl font-black text-purple-600">-{totalCapituneCommission.toFixed(2)}$</p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Frais Capitune (10%)</p>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm border-l-4 border-l-green-600">
                 <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4"><Banknote className="w-5 h-5" /></div>
                 <p className="text-2xl font-black text-green-600">{totalNetRevenue.toFixed(2)}$</p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Revenus Nets (90%)</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-[24px] shadow-lg">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white mb-4"><Users className="w-5 h-5" /></div>
                 <p className="text-2xl font-black text-white">{events.reduce((acc, e) => acc + e.registeredCount, 0)}</p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Inscrits Cumulés</p>
              </div>
           </div>

           {/* Liste de Gestion Expert */}
           <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4 text-purple-600" /> Mon Studio de Production</h3>
                 <span className="text-[9px] bg-purple-100 text-purple-600 px-3 py-1 rounded-full font-black uppercase">Paiements sous 48h</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Webinaire</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Inscrits</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Brut Total</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ma Part (90%)</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {events.map(event => {
                         const brut = (event.price || 0) * event.registeredCount;
                         const net = brut * 0.9;
                         return (
                          <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <img src={event.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                   <div>
                                      <p className="text-xs font-bold text-slate-900">{event.title}</p>
                                      <span className="text-[8px] font-black uppercase text-slate-400">{event.status}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-xs font-black text-slate-900">{event.registeredCount}</td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-500">{brut.toFixed(2)}$</td>
                             <td className="px-6 py-4 text-xs font-black text-green-600">{net.toFixed(2)}$</td>
                             <td className="px-6 py-4 text-right">
                                <button className="p-2 text-slate-400 hover:text-purple-600"><Edit2 className="w-4 h-4" /></button>
                                <button className="p-2 text-slate-400 hover:text-purple-600"><PieChart className="w-4 h-4" /></button>
                             </td>
                          </tr>
                         );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            const isRegistered = registeredIds.has(event.id);
            return (
              <div key={event.id} className="bg-white rounded-[28px] overflow-hidden border border-slate-200 shadow-sm flex flex-col group hover:shadow-xl transition-all duration-300">
                <div className="relative h-44">
                  <img src={event.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase text-white ${event.status === EventStatus.LIVE ? 'bg-red-600' : 'bg-purple-600'}`}>{event.status}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-white/90 text-slate-900 text-[8px] font-black uppercase">{event.isPaid ? `${event.price}$ CAD` : 'Gratuit'}</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-sm font-black text-slate-900 mb-2 leading-tight">{event.title}</h3>
                  <p className="text-[10px] text-slate-500 mb-4 line-clamp-2">{event.description}</p>
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {event.registeredCount} Partic.</span>
                     <button onClick={() => handleRegistration(event)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isRegistered ? 'bg-purple-100 text-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100'}`}>
                        {isRegistered ? 'Mon Pass' : 'Participer'}
                     </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CAPITUNE PAY (Logic 10/90 incluse) */}
      {paymentStep && activePaymentEvent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col md:flex-row">
              <div className="md:w-64 bg-slate-50 p-8 border-r border-slate-100 flex flex-col">
                 <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg"><CardIcon className="w-6 h-6" /></div>
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Capitune Pay</h3>
                 <p className="text-[8px] text-slate-400 font-bold uppercase mb-8">Paiement Institutionnel</p>
                 
                 <div className="space-y-4 mb-auto">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>Prix Unitaire</span><span className="text-slate-900">{activePaymentEvent.price?.toFixed(2)}$</span></div>
                    
                    {/* Visualisation de la répartition institutionnelle */}
                    <div className="pt-2 pb-2 border-y border-slate-100 space-y-2">
                       <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                          <span>Part Expert (90%)</span>
                          <span className="text-green-600">{((activePaymentEvent.price || 0) * 0.9).toFixed(2)}$</span>
                       </div>
                       <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                          <span>Frais Capitune (10%)</span>
                          <span className="text-purple-600">{((activePaymentEvent.price || 0) * 0.1).toFixed(2)}$</span>
                       </div>
                    </div>

                    <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>Taxes ({ (TAX_RATE * 100).toFixed(3) }%)</span><span className="text-slate-900">{( (activePaymentEvent.price || 0) * TAX_RATE ).toFixed(2)}$</span></div>
                    
                    <div className="pt-4 border-t border-slate-200">
                       <div className="flex justify-between items-center"><span className="text-[10px] font-black text-purple-600 uppercase">Total CAD</span><span className="text-xl font-black text-slate-900">{( (activePaymentEvent.price || 0) * (1 + TAX_RATE) ).toFixed(2)}$</span></div>
                    </div>
                 </div>
                 <div className="mt-8 p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-[8px] font-black text-slate-400 uppercase">Audit Tracé (10/90)</span>
                 </div>
              </div>
              
              <div className="flex-1 p-8">
                 {paymentStep === 'summary' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                       <div className="flex justify-between items-start">
                          <div>
                             <h4 className="text-xl font-black text-slate-900">Validation de l'accès</h4>
                             <p className="text-slate-500 text-xs mt-1">Export Monde Prestige Inc.</p>
                          </div>
                          <button onClick={() => setPaymentStep(null)} className="p-2 text-slate-300 hover:text-slate-600"><X className="w-5 h-5" /></button>
                       </div>
                       <div className="p-4 bg-white border border-slate-100 rounded-3xl flex gap-4 items-center shadow-sm">
                          <img src={activePaymentEvent.thumbnail} className="w-14 h-14 rounded-xl object-cover" alt="" />
                          <div>
                             <p className="text-xs font-black text-slate-900">{activePaymentEvent.title}</p>
                             <p className="text-[9px] text-purple-600 font-bold uppercase">Expert: {activePaymentEvent.instructor}</p>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-2">
                          <button onClick={() => setSelectedMethod('card')} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedMethod === 'card' ? 'border-purple-600 bg-purple-50/30' : 'border-slate-50 hover:bg-slate-50'}`}>
                             <div className={`p-2.5 rounded-xl ${selectedMethod === 'card' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Smartphone className="w-5 h-5" /></div>
                             <div className="flex-1">
                                <p className="text-[11px] font-black text-slate-900">Carte de Crédit</p>
                                <p className="text-[9px] text-slate-400 font-medium">Visa / Mastercard / Amex</p>
                             </div>
                          </button>
                       </div>

                       <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <input 
                            type="checkbox" 
                            id="terms" 
                            checked={acceptTerms} 
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <label htmlFor="terms" className="text-[10px] text-slate-500 font-medium leading-tight cursor-pointer">
                            J'accepte les <button type="button" onClick={() => setShowLegalPolicy(true)} className="text-purple-600 font-bold hover:underline">conditions de vente</button> d'Export Monde Prestige Inc. et la répartition 10/90.
                          </label>
                       </div>

                       <button 
                         onClick={startPaymentProcessing} 
                         disabled={!acceptTerms}
                         className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${acceptTerms ? 'bg-purple-600 text-white shadow-purple-100 hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                       >
                         Confirmer le paiement {( (activePaymentEvent.price || 0) * (1 + TAX_RATE) ).toFixed(2)}$
                       </button>
                    </div>
                 )}
                 {paymentStep === 'processing' && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-10">
                       <div className="relative w-24 h-24">
                          <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          <Lock className="absolute inset-0 m-auto w-8 h-8 text-purple-600 animate-pulse" />
                       </div>
                       <h4 className="text-lg font-black text-slate-900 uppercase">Ventilation Institutionnelle...</h4>
                       <div className="w-full max-w-[200px] h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600 transition-all duration-1000" style={{ width: `${(processingSubStep / 3) * 100}%` }} />
                       </div>
                    </div>
                 )}
                 {paymentStep === 'success' && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-10 animate-in zoom-in duration-500">
                       <div className="w-20 h-20 bg-green-500 text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-green-100"><CheckCircle2 className="w-10 h-10" /></div>
                       <div className="space-y-1">
                          <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Accès Débloqué</h4>
                          <p className="text-slate-500 text-xs">Un reçu officiel avec répartition a été envoyé.</p>
                       </div>
                       <div className="w-full space-y-3 pt-4">
                          <button onClick={() => { setShowTicketModal(activePaymentEvent); setPaymentStep(null); }} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl">Accéder à mon Pass</button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL POLITIQUE DE PAIEMENT */}
      {showLegalPolicy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl my-8 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><Scale className="w-5 h-5" /></div>
                <h2 className="text-xl font-black text-slate-900">Conditions de Paiement</h2>
              </div>
              <button onClick={() => setShowLegalPolicy(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar prose prose-slate text-sm font-medium text-slate-600 leading-relaxed">
              <h4 className="text-slate-900 font-black mb-4">Export Monde Prestige Inc. (Capitune)</h4>
              <p>Adresse : 103-93 Rue des Castel, Lévis, QC G6V 2B8, Canada</p>
              <h5 className="text-slate-900 font-bold mt-6 mb-2">1) Répartition des Revenus (10/90)</h5>
              <p>Toute transaction effectuée sur la Plateforme fait l'objet d'une commission de service institutionnelle de 10% retenue par Capitune. Les 90% restants constituent le revenu brut de l'Expert prestataire avant impôts personnels.</p>
              <h5 className="text-slate-900 font-bold mt-6 mb-2">2) Monnaie, taxes et facturation</h5>
              <p>Les prix sont affichés en CAD. Les taxes (TPS/TVQ) sont indiquées lors du paiement. Une confirmation de paiement est fournie par courriel après validation.</p>
              <h5 className="text-slate-900 font-bold mt-6 mb-2">7) Politique d’annulation et de remboursement</h5>
              <p><strong>Événements / webinaires :</strong> Annulation possible jusqu'à 48h avant pour un remboursement intégral. Aucun remboursement en cas d'annulation tardive.</p>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setShowLegalPolicy(false)} className="px-8 py-3 bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">J'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {/* TICKET / PASS SESSION */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[160] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-8 space-y-6 text-center relative">
                 <button onClick={() => setShowTicketModal(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 bg-slate-50 rounded-full transition-all"><X className="w-5 h-5" /></button>
                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[8px] font-black uppercase tracking-widest mb-4">Pass Institutionnel Officiel</div>
                 <div className="mx-auto w-40 h-40 bg-slate-50 p-3 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center shadow-inner group">
                    <QrCode className="w-full h-full text-slate-900 group-hover:scale-95 transition-transform" />
                 </div>
                 <div className="space-y-1 text-center">
                    <h2 className="text-lg font-black text-slate-900 leading-tight">{showTicketModal.title}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(showTicketModal.date).toLocaleDateString()} • {showTicketModal.duration}</p>
                 </div>
                 <div className="p-4 bg-slate-900 rounded-[24px] text-white shadow-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3 overflow-hidden text-left">
                       <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg"><LinkIcon className="w-4 h-4" /></div>
                       <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase opacity-60">Lien Session</p>
                          <p className="text-[11px] font-bold truncate">Lien sécurisé actif</p>
                       </div>
                    </div>
                    <a href={showTicketModal.meetingLink} target="_blank" rel="noreferrer" className="p-3 bg-white text-slate-900 rounded-xl hover:scale-110 transition-transform"><ExternalLink className="w-4 h-4" /></a>
                 </div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pt-4">TITULAIRE: {user.name.toUpperCase()}</p>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CRÉATION WEBINAIRE */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
           <div className="bg-white w-full max-w-2xl my-8 rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Video className="w-6 h-6" /></div>
                    <div>
                       <h2 className="text-xl font-black text-slate-900">Nouveau Webinaire</h2>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Studio Expert Capitune</p>
                    </div>
                 </div>
                 <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setShowCreateModal(false); }} className="p-8 space-y-6">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Affiche de l'événement</label>
                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 hover:border-purple-200 transition-all overflow-hidden relative group">
                       <ImageIcon className="w-8 h-8 text-slate-300" />
                       <p className="text-[11px] font-black text-slate-400 uppercase mt-2">Choisir une image</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                 </div>
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de la session</label>
                    </div>
                    <input required type="text" placeholder="Ex: Entrée Express 2025" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type d'accès</label>
                       <select className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700">
                          <option value="false">Gratuit</option>
                          <option value="true">Payant (Premium)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix (CAD)</label>
                       <input type="number" placeholder="49.99" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl outline-none font-bold text-slate-700" />
                    </div>
                 </div>
                 <div className="pt-4 flex gap-4">
                    <button type="submit" className="flex-1 py-4 bg-purple-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-100">Publier Session</button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-[24px] font-black uppercase tracking-widest text-xs">Annuler</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Events;
