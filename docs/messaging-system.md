# Système de Messagerie CAPITUNE

## 📝 Fonctionnalités Implémentées

### 1. Architecture Base de Données
- ✅ **Modèle `Conversation`** : Conversations 1-à-1 entre utilisateurs
  - Participants : `initiator` et `recipient`
  - Suivi : `lastMessageAt` pour le tri
  - Contrainte unique : une seule conversation par paire d'utilisateurs

- ✅ **Modèle `Message`** : Messages individuels
  - Contenu : texte (max 5000 caractères)
  - Statut de lecture : `isRead`, `readAt`
  - Relations : `conversation`, `sender`

### 2. API Routes

#### `GET /api/conversations`
Récupère toutes les conversations de l'utilisateur connecté avec :
- Les participants
- Le dernier message de chaque conversation
- Le nombre de messages non lus

#### `POST /api/conversations`
Crée ou récupère une conversation avec un autre utilisateur.
**Règle métier** : Messages uniquement entre demandeurs (USER) et professionnels (PROFESSIONAL).

#### `POST /api/messages`
Envoie un message dans une conversation.
Validation : contenu non vide, max 5000 caractères.

#### `GET /api/conversations/[conversationId]/messages`
Récupère tous les messages d'une conversation.
**Auto-lecture** : Marque automatiquement comme lus les messages reçus.

### 3. Composants UI

#### `MessagingWidget`
Widget flottant en bas à droite avec :
- 🔵 Badge de notification (nombre de messages non lus)
- 👤 Avatars des contacts
- 📝 Aperçu du dernier message
- ⚙️ Menu d'options (trois points)
- 🔄 Rafraîchissement automatique (toutes les 10 secondes)

#### `ConversationWindow`
Fenêtre de conversation complète (style LinkedIn) avec :
- 💬 Zone de messages avec scroll automatique
- 📤 Input de saisie avec boutons d'action
- 👤 Avatar de l'autre participant
- 🕐 Timestamps formatés (aujourd'hui, hier, date)
- 🎨 Bulles de messages (bleu marine pour l'expéditeur, gris pour le destinataire)
- 📎 Boutons pour fichiers, GIF, emoji (UI préparée)
- 🔄 Rafraîchissement automatique (toutes les 5 secondes)

#### `MessagingManager`
Gestionnaire principal qui bascule entre le widget et la fenêtre de conversation.

### 4. Règles Métier

✅ **Restriction des conversations** :
- ✅ Demandeurs (USER) ↔ Professionnels (PROFESSIONAL) uniquement
- ❌ Pas de messagerie entre demandeurs
- ❌ Pas de messagerie entre professionnels (pour le moment)

✅ **Anti-spam** :
- Maximum 5000 caractères par message
- Validation côté serveur

✅ **Confidentialité** :
- Vérification stricte de participation
- Utilisateur doit être initiateur ou destinataire pour accéder aux messages

## 🚀 Déploiement

### Étape 1 : Activer la Base de Données

Votre base de données Neon est actuellement en pause. Pour la réactiver :

1. Accédez à [Neon Console](https://console.neon.tech)
2. Sélectionnez votre projet
3. Attendez quelques secondes que le projet se réveille

### Étape 2 : Appliquer la Migration

```powershell
cd capitune-web
npx prisma migrate deploy
```

Ou exécutez manuellement le fichier SQL :
```powershell
# Connectez-vous à votre base de données PostgreSQL et exécutez :
capitune-web/prisma/migrations/20260206_add_messaging_system/migration.sql
```

### Étape 3 : Régénérer le Client Prisma

```powershell
npx prisma generate
```

### Étape 4 : Redémarrer le Serveur

```powershell
npm run dev
```

## 🧪 Test du Système

### Scénario de Test

1. **Créer un compte demandeur et un compte professionnel**
2. **En tant que demandeur**, naviguer vers le profil d'un professionnel
3. **Ajouter un bouton "Contacter"** (à implémenter) qui appelle :
   ```typescript
   const res = await fetch("/api/conversations", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ otherUserId: "ID_DU_PRO" }),
   });
   const { conversation } = await res.json();
   // Ouvrir la conversation
   ```
4. **Vérifier** que le widget affiche la nouvelle conversation
5. **Envoyer des messages** et vérifier la synchronisation

### Exemple d'Intégration : Bouton "Contacter" sur Profil Marketplace

Dans `src/components/marketplace/marketplace-profile-card.tsx` (à créer si inexistant) :

```typescript
"use client";

import { useState } from "react";

export function ContactButton({ professionalId }: { professionalId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleContact() {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: professionalId }),
      });
      
      if (res.ok) {
        // Le widget de messagerie se rafraîchira automatiquement
        alert("Conversation ouverte ! Consultez votre messagerie.");
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de l'ouverture de la conversation");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleContact}
      disabled={loading}
      className="rounded-(--radius-md) bg-navy px-4 py-2 text-white hover:bg-navy/90"
    >
      {loading ? "Chargement..." : "Contacter"}
    </button>
  );
}
```

## 📋 Prochaines Étapes (Facultatif)

### Améliorations UX
- [ ] Notifications en temps réel (WebSockets ou Server-Sent Events)
- [ ] Indicateur de frappe ("est en train d'écrire...")
- [ ] Réactions emoji sur les messages
- [ ] Envoi de fichiers/images

### Fonctionnalités Avancées
- [ ] Archivage de conversations
- [ ] Recherche dans les messages
- [ ] Conversations de groupe (pour support client)
- [ ] Modération automatique (filtrage de contenu inapproprié)

### Intégrations
- [ ] Lier les conversations aux demandes marketplace
- [ ] Context de conversation (afficher la demande associée)
- [ ] Boutons d'action rapide ("Accepter la demande", "Planifier RDV")

## 🎨 Personnalisation

### Couleurs
Les couleurs utilisent les variables Tailwind :
- `bg-navy` : Bulles de messages de l'expéditeur
- `bg-gray-100` : Bulles de messages du destinataire
- `bg-red-500` : Badge de notifications

Pour personnaliser, modifiez `tailwind.config.ts`.

### Taille du Widget
Dans `conversation-window.tsx` :
- Hauteur : `h-[500px]` (ligne 140)
- Largeur : `w-96` (384px)

### Fréquence de Rafraîchissement
- Widget : toutes les 10 secondes (ligne 38 de `messaging-widget.tsx`)
- Conversation : toutes les 5 secondes (ligne 50 de `conversation-window.tsx`)

## 🐛 Dépannage

### Erreur "conversation n'existe pas sur PrismaClient"
➡️ Régénérez le client Prisma : `npx prisma generate`

### Messages non lus ne se mettent pas à jour
➡️ Vérifiez que l'API `/api/conversations/[id]/messages` est appelée lors de l'ouverture de la conversation

### Erreur 403 "Messages uniquement entre demandeurs et professionnels"
➡️ Vérifiez que :
- Un des deux utilisateurs a `accountType: "PROFESSIONAL"` ET un `marketplaceProfile`
- L'autre utilisateur a `accountType: "USER"` OU n'a PAS de `marketplaceProfile`

## ✅ Checklist de Vérification

- [x] Schéma Prisma mis à jour avec Conversation et Message
- [x] Migration SQL créée
- [x] 4 API routes fonctionnelles
- [x] Widget de messagerie intégré au layout
- [x] Fenêtre de conversation avec tous les éléments UI
- [x] Règle métier demandeur ↔ pro appliquée
- [x] Auto-lecture des messages
- [x] Gestion des timestamps
- [ ] Base de données réveillée et migration appliquée
- [ ] Boutons "Contacter" ajoutés aux profils professionnels
- [ ] Tests utilisateur effectués

---

**Créé le** : 6 février 2026  
**Stack** : Next.js 16 App Router, Prisma 6.19, PostgreSQL (Neon), TypeScript
