"use client";

import { useState, useTransition } from "react";
import { searchProfessionals, sendPartnershipRequest, respondToPartnershipRequest } from "@/actions/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Check, X, Users, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AvatarBubble } from "@/components/ui/avatar-bubble";

type ProResult = Awaited<ReturnType<typeof searchProfessionals>>[number];
type NetworkData = {
    receivedRequests: any[];
    partners: any[];
};

export function NetworkPageClient({
    initialNetworkData,
    initialPros = [],
    viewerId
}: {
    initialNetworkData: NetworkData,
    initialPros?: ProResult[],
    viewerId: string
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<ProResult[]>(initialPros);
    const [isSearching, startSearchTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<"DISCOVER" | "NETWORK">("DISCOVER");
    const visibleResults = searchResults.filter((pro) => pro.id !== viewerId);
    
    // Invitation Modal
    const [selectedPro, setSelectedPro] = useState<ProResult | null>(null);
    const [invitationMessage, setInvitationMessage] = useState(
        "Bonjour, je trouve ton travail incroyable, je souhaite t'inviter dans mon réseau pour aider plus de personnes et échanger sur nos méthodes !"
    );
    const [isSending, startSendingTransition] = useTransition();
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [openingChatId, setOpeningChatId] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        startSearchTransition(async () => {
             const results = await searchProfessionals(searchTerm);
             setSearchResults(results);
             setActiveTab("DISCOVER");
        });
    };

    const handleOpenInvite = (pro: ProResult) => {
        setInvitationMessage(`Bonjour ${pro.fullName.split(' ')[0]}, je trouve ton travail incroyable, je souhaite t'inviter dans mon réseau pour aider plus de personnes et échanger sur nos méthodes !`);
        setSelectedPro(pro);
    };

    const handleSendInvite = () => {
        if (!selectedPro) return;
        
        startSendingTransition(async () => {
            try {
                await sendPartnershipRequest(selectedPro.id, invitationMessage);
                setStatusMessage({ type: 'success', text: "Demande envoyée avec succès !" });
                setTimeout(() => setStatusMessage(null), 3000);
                setSelectedPro(null);
                // Refresh search results to update UI
                const updatedResults = await searchProfessionals(searchTerm);
                setSearchResults(updatedResults);
            } catch (err) {
                setStatusMessage({ type: 'error', text: "Erreur lors de l'envoi de la demande." });
                setTimeout(() => setStatusMessage(null), 3000);
            }
        });
    };

    const handleRespond = async (requestId: string, accept: boolean) => {
        try {
            await respondToPartnershipRequest(requestId, accept);
            setStatusMessage({ type: 'success', text: accept ? "Invitation acceptée !" : "Invitation refusée." });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ type: 'error', text: "Une erreur est survenue." });
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handleOpenChat = async (partnerId: string) => {
        setOpeningChatId(partnerId);
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otherUserId: partnerId }),
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Impossible d'ouvrir la conversation");
            }
            
            const { conversation } = await res.json();
            
            if (!conversation?.id) {
                throw new Error("ID de conversation manquant");
            }

            console.log("Conversation opened:", conversation.id);
            
            // Dispatch custom event to open messaging widget
            window.dispatchEvent(
                new CustomEvent("open-conversation", { 
                    detail: { conversationId: conversation.id } 
                })
            );
        } catch (err: any) {
            console.error(err);
            setStatusMessage({ type: 'error', text: err.message || "Erreur ouverture chat" });
            setTimeout(() => setStatusMessage(null), 3000);
        } finally {
            setOpeningChatId(null);
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Status Notification */}
            {statusMessage && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 text-white animate-in slide-in-from-bottom ${
                    statusMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    {statusMessage.text}
                </div>
            )}

            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <h1 className="text-2xl font-bold text-navy">Réseau Stratégique</h1>
                    <p className="text-muted-foreground">
                        Connectez-vous avec d'autres experts pour échanger des recommandations et méthodes.
                    </p>
                 </div>
                 <div className="flex gap-2">
                     <Button 
                        variant={activeTab === "DISCOVER" ? "default" : "outline"}
                        onClick={() => setActiveTab("DISCOVER")}
                        className="gap-2"
                     >
                        <Search className="h-4 w-4" />
                        Découvrir
                     </Button>
                     <Button 
                        variant={activeTab === "NETWORK" ? "default" : "outline"}
                        onClick={() => setActiveTab("NETWORK")}
                        className="gap-2 relative"
                     >
                        <Users className="h-4 w-4" />
                        Mon Réseau
                        {initialNetworkData.receivedRequests.length > 0 && (
                            <span className="ml-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                                {initialNetworkData.receivedRequests.length}
                            </span>
                        )}
                     </Button>
                 </div>
            </div>

            {/* Content */}
            {activeTab === "DISCOVER" && (
                <div className="space-y-6">
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
                        <div className="relative flex-1">
                            {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> */}
                            <Input 
                                placeholder="Rechercher par nom, métier, ville..." 
                                className=""
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={isSearching}>
                            {isSearching ? "..." : "Rechercher"}
                        </Button>
                    </form>

                    {/* Results */}
                    {visibleResults.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visibleResults.map((pro) => (
                                <Card key={pro.id} className="p-4 flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow">
                                    <AvatarBubble 
                                        name={pro.fullName} 
                                        url={pro.avatarUrl} 
                                        size="lg"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-lg">{pro.fullName}</h3>
                                        <p className="text-sm text-primary font-medium">{pro.professionalProfile?.profession || "Professionnel"}</p>
                                        <p className="text-xs text-muted-foreground">{pro.professionalProfile?.headline}</p>
                                        {pro.professionalProfile?.city && (
                                             <p className="text-xs text-muted-foreground mt-1">{pro.professionalProfile.city}</p>
                                        )}
                                    </div>
                                    
                                    <div className="mt-auto pt-2 w-full">
                                        {pro.connectionStatus === "NONE" && (
                                            <Button className="w-full gap-2" variant="outline" onClick={() => handleOpenInvite(pro)}>
                                                <UserPlus className="h-4 w-4" />
                                                Se connecter
                                            </Button>
                                        )}
                                         {pro.connectionStatus === "PENDING" && (
                                            <Button className="w-full gap-2" variant="secondary" disabled>
                                                {pro.requestDirection === 'SENT' ? "Demande envoyée" : "Demande reçue"}
                                            </Button>
                                        )}
                                        {pro.connectionStatus === "ACCEPTED" && (
                                            <Button className="w-full gap-2" variant="ghost" disabled>
                                                <Check className="h-4 w-4" />
                                                Connecté
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-lg">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <h3 className="text-lg font-medium text-navy">Trouvez des partenaires</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Utilisez la barre de recherche pour trouver des professionnels par métier ou localisation.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "NETWORK" && (
                <div className="space-y-8">
                    {/* Invitations reçues */}
                    {initialNetworkData.receivedRequests.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-sm font-bold">Invitations</span>
                                <span className="text-muted-foreground text-sm font-normal">({initialNetworkData.receivedRequests.length})</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {initialNetworkData.receivedRequests.map((req) => (
                                     <Card key={req.id} className="p-4 flex flex-col gap-3">
                                         <div className="flex items-center gap-3">
                                            <AvatarBubble 
                                                name={req.from.fullName} 
                                                url={req.from.avatarUrl} 
                                                size="md"
                                            />
                                            <div className="overflow-hidden">
                                                <h4 className="font-semibold truncate">{req.from.fullName}</h4>
                                                <p className="text-xs text-muted-foreground truncate">{req.from.professionalProfile?.profession}</p>
                                            </div>
                                         </div>
                                         <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 italic">
                                             "{req.message}"
                                         </div>
                                         <div className="flex gap-2 mt-auto">
                                             <Button 
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                                                size="sm"
                                                onClick={() => handleRespond(req.id, true)}
                                             >
                                                 Accepter
                                             </Button>
                                             <Button 
                                                variant="outline" 
                                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" 
                                                size="sm"
                                                onClick={() => handleRespond(req.id, false)}
                                             >
                                                 Refuser
                                             </Button>
                                         </div>
                                     </Card>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Mes Relations */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Mes Relations ({initialNetworkData.partners.length})</h3>
                        {initialNetworkData.partners.length > 0 ? (
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {initialNetworkData.partners.map((partner) => (
                                    <div key={partner.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                        <AvatarBubble 
                                            name={partner.fullName} 
                                            url={partner.avatarUrl} 
                                            size="md"
                                        />
                                        <div className="overflow-hidden flex-1">
                                            <h4 className="font-medium text-sm truncate">{partner.fullName}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{partner.professionalProfile?.profession}</p>
                                        </div>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-muted-foreground hover:text-primary"
                                            onClick={() => handleOpenChat(partner.id)}
                                            disabled={openingChatId === partner.id}
                                            title="Envoyer un message"
                                        >
                                            {openingChatId === partner.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            ) : (
                                                <MessageSquare className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <p className="text-muted-foreground italic">Vous n'avez pas encore de relations. Commencez par découvrir des profils !</p>
                        )}
                    </section>
                </div>
            )}

            {/* Modal Invitation Replacement (Custom manual overlay) */}
            {selectedPro && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-slate-50 p-6 border-b flex items-start justify-between">
                            <div className="flex gap-4">
                                <AvatarBubble
                                    name={selectedPro.fullName}
                                    url={selectedPro.avatarUrl}
                                    size="lg"
                                />
                                <div>
                                    <h3 className="text-lg font-bold text-navy">{selectedPro.fullName}</h3>
                                    <p className="text-sm text-primary font-medium">{selectedPro.professionalProfile?.profession || "Professionnel"}</p>
                                    {selectedPro.professionalProfile?.city && (
                                        <p className="text-xs text-muted-foreground mt-1">{selectedPro.professionalProfile.city}</p>
                                    )}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedPro(null)} className="-mt-2 -mr-2 text-muted-foreground hover:text-navy">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-navy">Votre message</label>
                                <p className="text-xs text-muted-foreground">
                                    Une invitation personnalisée augmente vos chances d'acceptation.
                                </p>
                            </div>
                            
                            <Textarea
                                value={invitationMessage}
                                onChange={(e) => setInvitationMessage(e.target.value)}
                                rows={5}
                                className="bg-white resize-none border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Bonjour..."
                            />

                            <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-md border border-blue-100">
                                <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold block mb-0.5">Pourquoi se connecter ?</span>
                                    Échangez sur vos pratiques, partagez des opportunités et élargissez votre impact.
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setSelectedPro(null)}>Annuler</Button>
                            <Button onClick={handleSendInvite} disabled={isSending} className="min-w-[140px]">
                                {isSending ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Envoi...
                                    </span>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Envoyer l'invitation
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
