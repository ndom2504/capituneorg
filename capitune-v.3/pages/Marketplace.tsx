
import React, { useEffect, useMemo, useState } from 'react';
import { ServiceRequest, User, UserRole, ProjectType } from '../types';
import { MOCK_REQUESTS, MOCK_USERS } from '../constants';
import { auth } from '../lib/firebase';
import { 
  FileText, 
  Search, 
  Plus, 
  Clock, 
  ArrowRight, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Loader2,
  Download,
  FolderOpen,
  MessageSquare,
  Users,
  X
} from 'lucide-react';

interface MarketplaceProps {
  user: User;
}

type DossiersApiItem = {
  id: string;
  title: string;
  description: string;
  status: 'Ouvert' | 'En cours' | 'Clôturé' | string;
  category: string;
  createdAt: string;
  requester: { id: string; fullName: string; avatarUrl: string | null };
  professional: { id: string; fullName: string; avatarUrl: string | null };
  documents: Array<{ id: string; name: string; url: string; slot?: string | null; status: 'PENDING' | 'VALIDATED' | 'REJECTED'; type: string; updatedAt: string }>;
};

type ParticipantMeta = { name?: string; avatar?: string };

const Marketplace: React.FC<MarketplaceProps> = ({ user }) => {
  const [filter, setFilter] = useState('All');
  const [searchId, setSearchId] = useState('');
  const [activeDossierId, setActiveDossierId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState<ProjectType>(ProjectType.IMMIGRATION);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ dossierId: string; slot?: string | null } | null>(null);

  const [localCreatedDossiers, setLocalCreatedDossiers] = useState<ServiceRequest[]>([]);
  const [realDossiers, setRealDossiers] = useState<ServiceRequest[] | null>(null);
  const [participantMetaById, setParticipantMetaById] = useState<Record<string, ParticipantMeta>>({});
  const [dossiersError, setDossiersError] = useState<string | null>(null);

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';

  const checklistFor = (category: ProjectType) => {
    // Slots stables (tag) -> labels
    if (category === ProjectType.ETUDES) {
      return [
        { slot: 'PASSPORT', label: "Pièce d'identité (passeport/CNI)", required: true },
        { slot: 'ACCEPTANCE', label: "Lettre d'acceptation / Contrat", required: true },
        { slot: 'FUNDS', label: 'Preuve de fonds', required: true },
      ] as const;
    }
    if (category === ProjectType.TRAVAIL) {
      return [
        { slot: 'PASSPORT', label: "Pièce d'identité (passeport/CNI)", required: true },
        { slot: 'OFFER', label: "Offre d'emploi / Contrat", required: true },
        { slot: 'CV', label: 'CV', required: false },
      ] as const;
    }
    if (category === ProjectType.INSTALLATION) {
      return [
        { slot: 'PASSPORT', label: "Pièce d'identité (passeport/CNI)", required: true },
        { slot: 'ADDRESS', label: 'Justificatif de domicile', required: false },
      ] as const;
    }
    return [
      { slot: 'PASSPORT', label: "Pièce d'identité (passeport/CNI)", required: true },
      { slot: 'FUNDS', label: 'Preuve de fonds', required: true },
      { slot: 'FORMS', label: 'Formulaires / pièces complémentaires', required: false },
    ] as const;
  };

  const resolveDocUrl = (url: string | undefined) => {
    const u = (url || '').trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (!apiBaseUrl) return u;
    return `${apiBaseUrl}${u}`;
  };

  const withIdToken = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Connectez-vous pour continuer.');
    return await firebaseUser.getIdToken();
  };

  const updateDossierDocuments = (dossierId: string, docs: ServiceRequest['documents']) => {
    if (realDossiers) {
      setRealDossiers((prev) => (prev ?? []).map((d) => (d.id === dossierId ? { ...d, documents: docs } : d)));
      return;
    }
    setLocalCreatedDossiers((prev) => prev.map((d) => (d.id === dossierId ? { ...d, documents: docs } : d)));
  };

  const toProjectType = (raw: string): ProjectType => {
    const v = (raw || '').trim().toLowerCase();
    if (v === 'études' || v === 'etudes') return ProjectType.ETUDES;
    if (v === 'travail') return ProjectType.TRAVAIL;
    if (v === 'installation') return ProjectType.INSTALLATION;
    return ProjectType.IMMIGRATION;
  };

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateCategory(ProjectType.IMMIGRATION);
    setCreateError(null);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setDossiersError(null);

      if (!apiBaseUrl) {
        // Pas d'API configurée: on reste sur les mocks.
        setRealDossiers(null);
        return;
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setRealDossiers([]);
        setDossiersError('Connectez-vous pour charger vos dossiers.');
        return;
      }

      let idToken = '';
      try {
        idToken = await firebaseUser.getIdToken();
      } catch {
        setRealDossiers([]);
        setDossiersError('Impossible de récupérer le jeton de connexion.');
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/api/v3/dossiers`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = (await res.json().catch(() => null)) as { items?: DossiersApiItem[]; error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || 'Erreur lors du chargement des dossiers');
        }

        const items = data?.items ?? [];
        const nextMeta: Record<string, ParticipantMeta> = {};
        const mapped: ServiceRequest[] = items.map((item) => {
          nextMeta[item.requester.id] = {
            name: item.requester.fullName,
            avatar: item.requester.avatarUrl ?? undefined,
          };
          nextMeta[item.professional.id] = {
            name: item.professional.fullName,
            avatar: item.professional.avatarUrl ?? undefined,
          };

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            requesterId: item.requester.id,
            expertId: item.professional.id,
            category: toProjectType(item.category),
            status: (item.status === 'Ouvert' || item.status === 'En cours' || item.status === 'Clôturé') ? item.status : 'Ouvert',
            createdAt: item.createdAt,
            documents: item.documents,
          };
        });

        if (cancelled) return;
        setParticipantMetaById((prev) => ({ ...prev, ...nextMeta }));
        setRealDossiers(mapped);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Erreur lors du chargement des dossiers';
        setRealDossiers([]);
        setDossiersError(message);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, user.id, user.role]);

  const baseDossiers = useMemo<ServiceRequest[]>(() => {
    if (realDossiers) return realDossiers;

    return user.role === UserRole.PARTICULIER
      ? [...localCreatedDossiers, ...MOCK_REQUESTS.filter((r) => r.requesterId === user.id)]
      : user.role === UserRole.PROFESSIONNEL
        ? [...localCreatedDossiers, ...MOCK_REQUESTS.filter((r) => r.expertId === user.id)]
        : [...localCreatedDossiers, ...MOCK_REQUESTS];
  }, [localCreatedDossiers, realDossiers, user.id, user.role]);

  const normalizedSearch = searchId.trim().toLowerCase();

  const userDossiers = useMemo<ServiceRequest[]>(() => {
    return baseDossiers.filter((req) => {
      const matchesFilter = filter === 'All' || req.category === filter;

      const matchesSearch =
        !normalizedSearch ||
        req.id.toLowerCase().includes(normalizedSearch) ||
        `cap-${req.id}`.includes(normalizedSearch) ||
        `#cap-${req.id}`.includes(normalizedSearch) ||
        `capitune-${req.id}`.includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [baseDossiers, filter, normalizedSearch]);

  const activeDossier = useMemo<ServiceRequest | null>(() => {
    if (!activeDossierId) return null;
    return baseDossiers.find((d) => d.id === activeDossierId) ?? null;
  }, [activeDossierId, baseDossiers]);

  const openChatWith = (participantId: string, meta?: ParticipantMeta) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('capitune:v3:open-chat', {
        detail: {
          participantId,
          participantName: meta?.name,
          participantAvatar: meta?.avatar,
        },
      })
    );
  };

  const getChatParticipantId = (req: ServiceRequest) => {
    if (user.role === UserRole.PARTICULIER) return req.expertId || null;
    if (user.role === UserRole.PROFESSIONNEL) return req.requesterId;
    return req.expertId || req.requesterId;
  };

  const resolveMeta = (id: string | undefined | null): ParticipantMeta | null => {
    if (!id) return null;
    const meta = participantMetaById[id];
    if (meta?.name || meta?.avatar) return meta;
    const fromMock = MOCK_USERS.find((u) => u.id === id);
    if (!fromMock) return null;
    return { name: fromMock.name, avatar: fromMock.avatar };
  };

  const handleCreateDossier = async () => {
    if (createLoading) return;

    const title = createTitle.trim();
    const description = createDescription.trim();
    if (!title) {
      setCreateError('Veuillez entrer un titre.');
      return;
    }
    if (!description) {
      setCreateError('Veuillez entrer une description.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      if (!apiBaseUrl) {
        const now = new Date().toISOString();
        const localId = `local-${Date.now()}`;
        const newReq: ServiceRequest = {
          id: localId,
          title,
          description,
          requesterId: user.id,
          expertId: undefined,
          category: createCategory,
          status: 'Ouvert',
          createdAt: now,
          documents: [],
        };

        setLocalCreatedDossiers((prev) => [newReq, ...prev]);
        setIsCreateOpen(false);
        resetCreateForm();
        setActiveDossierId(localId);
        return;
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setCreateError('Vous devez être connecté pour créer un dossier.');
        return;
      }

      let idToken = '';
      try {
        idToken = await firebaseUser.getIdToken();
      } catch {
        setCreateError('Impossible de récupérer le jeton de connexion.');
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/v3/dossiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title,
          description,
          category: createCategory,
        }),
      });

      const data = (await res.json().catch(() => null)) as { item?: DossiersApiItem; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || 'Impossible de créer le dossier');
      }
      if (!data?.item) {
        throw new Error('Réponse invalide du serveur');
      }

      const item = data.item;
      const mapped: ServiceRequest = {
        id: item.id,
        title: item.title,
        description: item.description,
        requesterId: item.requester.id,
        expertId: item.professional.id,
        category: toProjectType(String(item.category)),
        status: (item.status === 'Ouvert' || item.status === 'En cours' || item.status === 'Clôturé') ? item.status : 'Ouvert',
        createdAt: item.createdAt,
        documents: item.documents,
      };

      setParticipantMetaById((prev) => ({
        ...prev,
        [item.requester.id]: { name: item.requester.fullName, avatar: item.requester.avatarUrl ?? undefined },
        [item.professional.id]: { name: item.professional.fullName, avatar: item.professional.avatarUrl ?? undefined },
      }));

      setRealDossiers((prev) => {
        const list = prev ?? [];
        return [mapped, ...list];
      });

      setIsCreateOpen(false);
      resetCreateForm();
      setActiveDossierId(mapped.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Impossible de créer le dossier';
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const openUploadPicker = (dossierId: string, slot?: string | null) => {
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatus('');
    setUploadTarget({ dossierId, slot: slot ?? null });

    const input = document.getElementById('v3-dossier-upload-input') as HTMLInputElement | null;
    input?.click();
  };

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    try {
      if (!apiBaseUrl) throw new Error("API non configurée.");
      setUploadError(null);
      setUploading(true);
      setUploadProgress(5);
      setUploadStatus('Préparation du téléversement…');

      const idToken = await withIdToken();

      const formData = new FormData();
      formData.append('file', file);
      if (uploadTarget.slot) formData.append('slot', uploadTarget.slot);

      // Progress simulé (fetch ne donne pas l'avancement nativement)
      let mounted = true;
      let progress = 5;
      const interval = window.setInterval(() => {
        if (!mounted) return;
        progress = Math.min(95, progress + Math.random() * 8);
        setUploadProgress(progress);
        if (progress < 35) setUploadStatus('Téléversement…');
        else if (progress < 70) setUploadStatus('Traitement…');
        else setUploadStatus('Finalisation…');
      }, 350);

      const res = await fetch(`${apiBaseUrl}/api/v3/dossiers/${uploadTarget.dossierId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      mounted = false;
      window.clearInterval(interval);

      type UploadApiItem = {
        id?: string;
        name?: string;
        url?: string;
        mimeType?: string | null;
        status?: 'PENDING' | 'VALIDATED' | 'REJECTED';
        updatedAt?: string;
        slot?: string | null;
      };
      type UploadApiResponse = { item?: UploadApiItem; error?: string } | null;

      const data = (await res.json().catch(() => null)) as UploadApiResponse;
      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de l'upload");
      }

      setUploadProgress(100);
      setUploadStatus('Terminé.');

      const dossier = baseDossiers.find((d) => d.id === uploadTarget.dossierId) ?? null;
      const existingDocs = dossier?.documents ?? [];

      const newDoc = {
        id: String(data?.item?.id || `doc-${Date.now()}`),
        name: String(data?.item?.name || file.name),
        status: data?.item?.status || 'PENDING',
        type: String(data?.item?.mimeType || file.type || 'FILE'),
        updatedAt: String(data?.item?.updatedAt || new Date().toISOString()),
        url: String(data?.item?.url || ''),
        slot: data?.item?.slot ?? null,
      };

      const nextDocs = (() => {
        // slot: remplacer l'existant; sinon append
        if (newDoc.slot) {
          const withoutSlot = existingDocs.filter((d) => (d.slot ?? null) !== newDoc.slot);
          return [newDoc, ...withoutSlot];
        }
        return [newDoc, ...existingDocs];
      })();

      updateDossierDocuments(uploadTarget.dossierId, nextDocs);

      window.setTimeout(() => {
        setUploading(false);
        setUploadStatus('');
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'upload";
      setUploadError(msg);
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      // reset input
      e.target.value = '';
      setUploadTarget(null);
    }
  };

  const handleValidateDoc = async (dossierId: string, docId: string, status: 'VALIDATED' | 'REJECTED') => {
    if (!apiBaseUrl) {
      setDossiersError('API non configurée.');
      return;
    }

    try {
      const idToken = await withIdToken();
      const res = await fetch(`${apiBaseUrl}/api/v3/dossiers/${dossierId}/documents/${docId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; status?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Erreur de mise à jour');

      const dossier = baseDossiers.find((d) => d.id === dossierId) ?? null;
      if (!dossier) return;
      const nextDocs = (dossier.documents ?? []).map((d) => (d.id === docId ? { ...d, status } : d));
      updateDossierDocuments(dossierId, nextDocs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de mise à jour';
      setDossiersError(msg);
    }
  };

  const handleDeleteDossier = async (dossierId: string) => {
    if (!dossierId || deleteLoadingId) return;
    const ok = window.confirm('Supprimer ce dossier ? Cette action est irréversible.');
    if (!ok) return;

    setDeleteError(null);
    setDeleteLoadingId(dossierId);

    try {
      if (!apiBaseUrl) {
        setLocalCreatedDossiers((prev) => prev.filter((d) => d.id !== dossierId));
        setActiveDossierId(null);
        return;
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setDeleteError('Vous devez être connecté pour supprimer un dossier.');
        return;
      }

      let idToken = '';
      try {
        idToken = await firebaseUser.getIdToken();
      } catch {
        setDeleteError('Impossible de récupérer le jeton de connexion.');
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/v3/dossiers/${encodeURIComponent(dossierId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Impossible de supprimer le dossier');
      }

      setRealDossiers((prev) => (prev ? prev.filter((d) => d.id !== dossierId) : prev));
      setActiveDossierId(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Impossible de supprimer le dossier';
      setDeleteError(message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <FolderOpen className="w-10 h-10 text-purple-600" />
            Espace Dossiers Canada
          </h1>
          <p className="text-slate-500 text-lg">Suivez l’avancement de vos démarches et collaborez avec vos experts.</p>
        </div>
        {user.role === UserRole.PARTICULIER && (
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-100 hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouveau Dossier
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex-1 relative min-w-62.5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Rechercher par numéro de dossier (ex: r1, CAP-r1)..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-200 transition-all"
          />
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
        {dossiersError && (
          <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-3xl p-4 text-sm font-bold">
            {dossiersError}
          </div>
        )}
        {userDossiers.map(req => {
          const expertMeta = resolveMeta(req.expertId ?? null);
          const requesterMeta = resolveMeta(req.requesterId);

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
                                      <span className="font-bold text-slate-700 truncate max-w-30">{doc.name}</span>
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
                        {((user.role === UserRole.PARTICULIER ? expertMeta?.avatar : requesterMeta?.avatar) || '').trim() ? (
                          <img
                            src={user.role === UserRole.PARTICULIER ? expertMeta?.avatar : requesterMeta?.avatar}
                            className="w-10 h-10 rounded-xl object-cover shadow-sm border-2 border-white"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 shadow-sm border-2 border-white flex items-center justify-center">
                            <span className="text-slate-500 font-black">
                              {(
                                user.role === UserRole.PARTICULIER
                                  ? (expertMeta?.name || 'E')
                                  : (requesterMeta?.name || 'D')
                              ).slice(0, 1).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {user.role === UserRole.PARTICULIER ? expertMeta?.name : requesterMeta?.name}
                          </p>
                          <p className="text-[10px] text-purple-600 font-bold uppercase">Membre vérifié</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:w-80 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-8 lg:pt-0 lg:pl-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">État de l’Engagement</p>
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
                    <button
                      onClick={() => setActiveDossierId(req.id)}
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-purple-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-100"
                    >
                      Ouvrir le Dossier
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => {
                        const participantId = getChatParticipantId(req);
                        if (!participantId) return;

                        const meta = user.role === UserRole.PARTICULIER
                          ? expertMeta
                          : user.role === UserRole.PROFESSIONNEL
                            ? requesterMeta
                            : resolveMeta(participantId);

                        openChatWith(participantId, meta ?? undefined);
                      }}
                      className="w-full bg-purple-50 text-purple-700 py-4 rounded-2xl font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-3"
                    >
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
            <p className="text-slate-400 font-bold">Vous n’avez aucun dossier actif pour le moment.</p>
          </div>
        )}
      </div>

      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveDossierId(null)}
            aria-label="Fermer"
          />

          <div className="relative w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-slate-200 rounded-4xl shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8 mauve-gradient text-white relative">
              <button
                onClick={() => setActiveDossierId(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 text-white hover:bg-white/30 rounded-2xl transition-colors"
                aria-label="Fermer la fiche dossier"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                  ID: #CAP-{activeDossier.id}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {activeDossier.category}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Statut: {activeDossier.status}
                </span>
              </div>

              <h2 className="mt-4 text-2xl md:text-3xl font-black">{activeDossier.title}</h2>
              <p className="mt-2 text-purple-100 font-medium max-w-3xl">{activeDossier.description}</p>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <input
                  id="v3-dossier-upload-input"
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  title="Ajouter un document au dossier"
                  aria-label="Ajouter un document au dossier"
                  onChange={handleUploadFileChange}
                />

                {uploadError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-3xl p-4 text-sm font-bold">
                    {uploadError}
                  </div>
                )}

                {uploading && (
                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Téléversement
                        </p>
                        <p className="text-xs font-bold text-white/90 truncate">{uploadStatus || 'En cours…'}</p>
                      </div>
                      <div className="text-2xl font-black">{Math.round(uploadProgress)}%</div>
                    </div>
                    <progress
                      className="mt-4 w-full h-2 rounded-full overflow-hidden accent-purple-500 bg-white/10"
                      max={100}
                      value={uploadProgress}
                    />
                  </div>
                )}

                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist</p>
                    {user.role === UserRole.PARTICULIER && (
                      <button
                        onClick={() => openUploadPicker(activeDossier.id, null)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-purple-50 text-purple-700 text-xs font-black hover:bg-purple-100 transition-all"
                      >
                        <Upload className="w-4 h-4" /> Ajouter un document
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {checklistFor(activeDossier.category).map((it) => {
                      const existing = (activeDossier.documents ?? []).find((d) => (d.slot ?? null) === it.slot);
                      const status = existing?.status || 'MISSING';

                      const statusIcon = status === 'VALIDATED'
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : status === 'REJECTED'
                          ? <AlertCircle className="w-4 h-4 text-rose-500" />
                          : status === 'PENDING'
                            ? <Clock className="w-4 h-4 text-amber-500" />
                            : <Clock className="w-4 h-4 text-slate-300" />;

                      return (
                        <div key={it.slot} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 bg-slate-50">
                          <div className="flex items-center gap-3 min-w-0">
                            {statusIcon}
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate">{it.label}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {it.required ? 'Obligatoire' : 'Facultatif'} • {status}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {user.role === UserRole.PARTICULIER && (
                              <button
                                onClick={() => openUploadPicker(activeDossier.id, it.slot)}
                                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                              >
                                {status === 'MISSING' ? 'Charger' : 'Remplacer'}
                              </button>
                            )}

                            {existing?.url && (
                              <a
                                href={resolveDocUrl(existing.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all inline-flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" /> Télécharger
                              </a>
                            )}

                            {user.role === UserRole.PROFESSIONNEL && existing?.id && (
                              <>
                                <button
                                  onClick={() => handleValidateDoc(activeDossier.id, existing.id, 'VALIDATED')}
                                  className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() => handleValidateDoc(activeDossier.id, existing.id, 'REJECTED')}
                                  className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                                >
                                  Refuser
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pièces Jointes</p>
                  {!activeDossier.documents?.length ? (
                    <p className="text-sm text-slate-500 font-medium">Aucun document pour le moment.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeDossier.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="font-bold text-slate-700 truncate">{doc.name}</span>
                          </div>
                          {doc.status === 'VALIDATED' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : doc.status === 'REJECTED' ? (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Participants</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {((resolveMeta(activeDossier.requesterId)?.avatar || '').trim()) ? (
                        <img
                          src={resolveMeta(activeDossier.requesterId)?.avatar}
                          className="w-10 h-10 rounded-xl object-cover shadow-sm border-2 border-white"
                          alt=""
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 shadow-sm border-2 border-white flex items-center justify-center">
                          <span className="text-slate-500 font-black">
                            {((resolveMeta(activeDossier.requesterId)?.name || 'D').slice(0, 1)).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {resolveMeta(activeDossier.requesterId)?.name ?? 'Demandeur'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Demandeur</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeDossier.expertId && ((resolveMeta(activeDossier.expertId)?.avatar || '').trim()) ? (
                        <img
                          src={resolveMeta(activeDossier.expertId)?.avatar}
                          className="w-10 h-10 rounded-xl object-cover shadow-sm border-2 border-white bg-slate-100"
                          alt=""
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 shadow-sm border-2 border-white flex items-center justify-center">
                          <span className="text-slate-500 font-black">
                            {(
                              activeDossier.expertId
                                ? (resolveMeta(activeDossier.expertId)?.name || 'E')
                                : '—'
                            ).slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {activeDossier.expertId
                            ? (resolveMeta(activeDossier.expertId)?.name ?? 'Expert')
                            : 'Non assigné'}
                        </p>
                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest">Expert</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Actions</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const participantId = getChatParticipantId(activeDossier);
                        if (!participantId) return;

                        const expert = resolveMeta(activeDossier.expertId ?? null);
                        const requester = resolveMeta(activeDossier.requesterId);
                        const meta = user.role === UserRole.PARTICULIER
                          ? expert
                          : user.role === UserRole.PROFESSIONNEL
                            ? requester
                            : resolveMeta(participantId);

                        openChatWith(participantId, meta ?? undefined);
                      }}
                      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-100"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Ouvrir la messagerie
                    </button>
                    <button
                      onClick={() => setActiveDossierId(null)}
                      className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
                    >
                      Fermer
                    </button>

                    {(user.role === UserRole.PARTICULIER || user.role === UserRole.ADMIN) && (
                      <button
                        onClick={() => handleDeleteDossier(activeDossier.id)}
                        disabled={deleteLoadingId === activeDossier.id}
                        className="w-full bg-red-50 text-red-700 py-4 rounded-2xl font-black hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        {deleteLoadingId === activeDossier.id ? 'Suppression…' : 'Supprimer le dossier'}
                      </button>
                    )}

                    {deleteError && (
                      <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm font-bold">
                        {deleteError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCreateOpen(false)}
            aria-label="Fermer"
          />

          <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-slate-200 rounded-4xl shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8 mauve-gradient text-white relative">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 p-2 bg-white/20 text-white hover:bg-white/30 rounded-2xl transition-colors"
                aria-label="Fermer la création"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl md:text-3xl font-black">Nouveau Dossier</h2>
              <p className="mt-2 text-purple-100 font-medium max-w-3xl">
                Décrivez votre besoin et nous l’assignerons à un expert.
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-5">
              {createError && (
                <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm font-bold">
                  {createError}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</p>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ex: Permis d'études - dossier complet"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-200"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Décrivez votre situation et vos objectifs..."
                  className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-200 min-h-30"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {Object.values(ProjectType).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCreateCategory(cat)}
                      className={
                        `px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ` +
                        (createCategory === cat ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
                  disabled={createLoading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateDossier}
                  className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black hover:bg-purple-700 transition-all disabled:opacity-50"
                  disabled={createLoading}
                >
                  {createLoading ? 'Création…' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
