
import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  microsoftProvider, 
  signInWithPopup 
} from '../lib/firebase';
import { ShieldCheck, Globe, Loader2, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';

const Login: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const currentDomain = window.location.hostname;

  const handleSignIn = async (provider: 'google' | 'microsoft') => {
    setLoading(provider);
    setError(null);
    try {
      const authProvider = provider === 'google' ? googleProvider : microsoftProvider;
      await signInWithPopup(auth, authProvider);
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError({ 
        message: err.message, 
        code: err.code 
      });
    } finally {
      setLoading(null);
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="p-10 text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 mauve-gradient rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-purple-200 animate-float">
              C
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Capitune V.3</h1>
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em] mt-1">Écosystème Canada Certifié</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Authentification Sécurisée</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Accédez à votre espace institutionnel dédié à l'accompagnement, l'immigration et les services professionnels.
            </p>
          </div>

          {error && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              {error.code === 'auth/unauthorized-domain' ? (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-left space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" /> Domaine non autorisé
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Ce domaine n'est pas encore autorisé dans votre console Firebase. Vous devez l'ajouter pour permettre la connexion :
                  </p>
                  <div className="flex items-center gap-2 p-2 bg-white border border-amber-100 rounded-xl">
                    <code className="text-[10px] font-black text-slate-700 flex-1 truncate">{currentDomain}</code>
                    <button onClick={copyDomain} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-purple-600">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <a 
                    href="https://console.firebase.google.com/project/capituneorg/authentication/settings" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-100"
                  >
                    Ouvrir la Console Firebase <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold">
                  {error.message}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={() => handleSignIn('google')}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-purple-200 transition-all group disabled:opacity-50"
            >
              {loading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              )}
              <span className="text-sm">Continuer avec Google</span>
            </button>

            <button 
              onClick={() => handleSignIn('microsoft')}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-purple-200 transition-all group disabled:opacity-50"
            >
              {loading === 'microsoft' ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              ) : (
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" className="w-5 h-5" alt="Microsoft" />
              )}
              <span className="text-sm">Continuer avec Microsoft</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Connexion Certifiée SSL</span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium">
              En vous connectant, vous acceptez les conditions de service d'Export Monde Prestige Inc.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <Globe className="w-3 h-3" />
            Capitune Canada • Gouvernance Numérique
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
