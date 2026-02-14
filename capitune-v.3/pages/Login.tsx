
import React, { useMemo, useState } from 'react';
import { 
  auth, 
  createUserWithEmailAndPassword,
  googleProvider, 
  microsoftProvider, 
  signInWithEmailAndPassword,
  signInWithPopup, 
  updateProfile
} from '../lib/firebase';
import { ShieldCheck, Globe, Loader2, AlertCircle, ExternalLink, Copy, Check, User, Briefcase } from 'lucide-react';
import BrandMark from '../components/BrandMark';

type AuthMode = 'signin' | 'signup';
type AuthAudience = 'particulier' | 'professionnel';

const getRoleStorageKey = (uid: string) => `capitune-v3:role:${uid}`;
const LAST_AUDIENCE_STORAGE_KEY = 'capitune-v3:lastAudience';

const Login: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [audience, setAudience] = useState<AuthAudience>(() => {
    if (typeof window === 'undefined') return 'particulier';
    const raw = window.localStorage.getItem(LAST_AUDIENCE_STORAGE_KEY);
    return raw === 'professionnel' ? 'professionnel' : 'particulier';
  });

  const currentDomain = window.location.hostname;

  const primaryCtaLabel = useMemo(() => {
    return mode === 'signup' ? "S’inscrire" : 'Se connecter';
  }, [mode]);

  const audienceLabel = useMemo(() => {
    return audience === 'professionnel' ? 'Professionnel' : 'Particulier';
  }, [audience]);

  const setAudienceAndPersist = (next: AuthAudience) => {
    setAudience(next);
    try {
      window.localStorage.setItem(LAST_AUDIENCE_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const handleAuth = async (provider: 'google' | 'microsoft') => {
    setLoading(provider);
    setError(null);
    try {
      const authProvider = provider === 'google' ? googleProvider : microsoftProvider;
      const result = await signInWithPopup(auth, authProvider);

      const uid = result.user?.uid;
      // Comme dans le clone: le type de compte est un choix d'inscription.
      // En mode connexion, on n'écrase pas le rôle existant.
      if (uid && mode === 'signup') {
        try {
          window.localStorage.setItem(getRoleStorageKey(uid), audience);
        } catch {
          // Best-effort only.
        }
      }
    } catch (err: unknown) {
      console.error("Auth Error:", err);
      const e = err as { message?: unknown; code?: unknown };
      setError({
        message: typeof e?.message === 'string' ? e.message : 'Authentification impossible.',
        code: typeof e?.code === 'string' ? e.code : undefined,
      });
    } finally {
      setLoading(null);
    }
  };

  const handleEmailAuth = async () => {
    setLoading('email');
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError({ message: 'Veuillez entrer un email.' });
      setLoading(null);
      return;
    }
    if (!password || password.length < 6) {
      setError({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      setLoading(null);
      return;
    }

    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const name = fullName.trim();
        if (name) {
          try {
            await updateProfile(result.user, { displayName: name });
          } catch {
            // Best-effort only
          }
        }

        const uid = result.user?.uid;
        if (uid) {
          try {
            window.localStorage.setItem(getRoleStorageKey(uid), audience);
          } catch {
            // Best-effort only.
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err: unknown) {
      console.error('Email Auth Error:', err);
      const e = err as { code?: unknown; message?: unknown };
      const code = typeof e?.code === 'string' ? e.code : String(e?.code ?? '');
      const friendlyMessage = (() => {
        switch (code) {
          case 'auth/invalid-credential':
            return "Email ou mot de passe incorrect. Si vous n'avez pas encore de compte, passez sur Inscription.";
          case 'auth/user-not-found':
            return "Aucun compte n'existe avec cet email. Passez sur Inscription.";
          case 'auth/wrong-password':
            return 'Mot de passe incorrect.';
          case 'auth/invalid-email':
            return "Format d'email invalide.";
          case 'auth/email-already-in-use':
            return "Cet email est déjà utilisé. Passez sur Connexion.";
          case 'auth/too-many-requests':
            return 'Trop de tentatives. Réessayez dans quelques minutes.';
          case 'auth/network-request-failed':
            return 'Problème réseau. Vérifiez votre connexion puis réessayez.';
          default:
            return typeof e?.message === 'string' ? e.message : 'Authentification impossible.';
        }
      })();

      setError({ message: friendlyMessage, code: code || (typeof e?.code === 'string' ? e.code : undefined) });
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
            <BrandMark className="animate-float" />
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Capitune V.3</h1>
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em] mt-1">Écosystème Canada Certifié</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Authentification Sécurisée</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {mode === 'signup'
                ? "Créez votre accès et choisissez votre type de compte."
                : "Connectez-vous à votre espace."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={
                  "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all " +
                  (mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700')
                }
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={
                  "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all " +
                  (mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700')
                }
              >
                Inscription
              </button>
            </div>

            {mode === 'signup' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type de compte</p>
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{audienceLabel}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceAndPersist('particulier')}
                    className={
                      "flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-[11px] " +
                      (audience === 'particulier'
                        ? 'bg-purple-50 border-purple-200 text-slate-800'
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50')
                    }
                  >
                    <User className="w-4 h-4" /> Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceAndPersist('professionnel')}
                    className={
                      "flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-[11px] " +
                      (audience === 'professionnel'
                        ? 'bg-purple-50 border-purple-200 text-slate-800'
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50')
                    }
                  >
                    <Briefcase className="w-4 h-4" /> Professionnel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {primaryCtaLabel}
                </p>
              </div>
            )}
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
                    rel="noopener noreferrer"
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
            {mode === 'signup' && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nom complet (optionnel)"
                className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-200"
                autoComplete="name"
              />
            )}

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-200"
              autoComplete="email"
              inputMode="email"
            />

            {mode === 'signup' ? (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-200"
                type="password"
                autoComplete="new-password"
              />
            ) : (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-200"
                type="password"
                autoComplete="current-password"
              />
            )}

            <button
              type="button"
              onClick={handleEmailAuth}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 text-white rounded-2xl font-black text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {loading === 'email' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : null}
              {primaryCtaLabel}
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ou</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => handleAuth('google')}
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
              onClick={() => handleAuth('microsoft')}
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
