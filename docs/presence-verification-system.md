# Système de Présence en Ligne & Badges de Vérification

Documentation V1 - Implémenté le 6 février 2026

## 📋 Vue d'ensemble

Deux nouveaux systèmes ont été ajoutés à Capitune pour améliorer l'engagement et la confiance :

1. **Système de présence en ligne** : Affiche qui est actuellement actif (indicateur vert 🟢)
2. **Système de badges de vérification** : Badges professionnels pour les profils vérifiés (✅ 🟦 ⭐)

## 🟢 Système de Présence en Ligne

### Architecture

**Stratégie** : Heartbeat polling (compatible Vercel, sans WebSockets)

- Le navigateur envoie un "ping" toutes les 30 secondes
- Le serveur enregistre `lastSeenAt` dans la base de données
- Un utilisateur est "en ligne" si `now - lastSeenAt <= 2 minutes`

### Schéma Base de Données

```prisma
model User {
  // Nouveau champs de présence
  lastSeenAt   DateTime?
  statusManual String?    // "busy", "away", etc. (optionnel)
}
```

### API Endpoints

#### POST `/api/presence/heartbeat`

Met à jour le statut de présence de l'utilisateur connecté.

**Auth** : Requise (session cookie)

**Body** (optionnel) :
```json
{
  "statusManual": "busy"  // Optionnel : busy, away, etc.
}
```

**Réponse** :
```json
{
  "success": true
}
```

**Appel automatique** : Toutes les 30s par `usePresence()` hook

#### GET `/api/presence?userIds=id1,id2,id3`

Récupère le statut en ligne de plusieurs utilisateurs.

**Auth** : Aucune (données publiques)

**Query params** :
- `userIds` : IDs séparés par virgules (max 100)

**Réponse** :
```json
{
  "user123": {
    "online": true,
    "lastSeenAt": "2026-02-06T15:30:00.000Z",
    "statusManual": null
  },
  "user456": {
    "online": false,
    "lastSeenAt": "2026-02-06T14:00:00.000Z",
    "statusManual": "busy"
  }
}
```

**Seuil "online"** : 2 minutes (120 000 ms)

### Composants Frontend

#### `usePresence()` Hook

Envoie automatiquement des heartbeats toutes les 30 secondes.

**Usage** :
```tsx
import { usePresence } from "@/lib/hooks/usePresence";

function DashboardShell() {
  usePresence(); // C'est tout ! ✨
  
  return <div>...</div>;
}
```

**Comportement** :
- ✅ Heartbeat immédiat au montage
- ✅ Heartbeat toutes les 30s
- ✅ Pause si onglet caché (`document.hidden`)
- ✅ Cleanup automatique au démontage

**⚠️ Important** : À utiliser uniquement dans des composants protégés par auth (ex: DashboardShell).

#### `usePresenceStatus(userIds)` Hook

Récupère et rafraîchit le statut de présence d'utilisateurs.

**Usage** :
```tsx
import { usePresenceStatus } from "@/lib/hooks/usePresence";

function UserList({ users }) {
  const presenceData = usePresenceStatus(users.map(u => u.id));
  
  return users.map(user => (
    <div>
      {user.name}
      {presenceData?.[user.id]?.online && "🟢"}
    </div>
  ));
}
```

**Comportement** :
- Fetch initial immédiat
- Refresh toutes les 30s
- Retourne `null` si `userIds` est vide

#### `AvatarBubble` - Indicateur en ligne

Le composant `AvatarBubble` a été mis à jour pour afficher un indicateur de présence.

**Props supplémentaires** :
- `showOnline?: boolean` - Afficher l'indicateur (défaut: `false`)
- `userId?: string` - ID utilisateur pour récupérer le statut

**Usage** :
```tsx
<AvatarBubble 
  name="Jean Dupont"
  url="/avatars/jean.jpg"
  size="lg"
  showOnline={true}
  userId="user123"
/>
```

**Rendu** :
- Point vert 🟢 en bas à droite si l'utilisateur est en ligne
- Rien si hors ligne
- Taille du point adaptée à la taille de l'avatar

### Intégrations

| Composant | Heartbeat | Indicateur |
|-----------|-----------|------------|
| `DashboardShell` | ✅ | - |
| `AvatarBubble` (marketplace) | - | ✅ |
| `AvatarBubble` (jobs) | - | ⏳ À venir |
| `AvatarBubble` (community) | - | ⏳ À venir |

## ✅ Système de Badges de Vérification

### Architecture

**Workflow** :
1. Pro crée son profil marketplace → `verificationStatus: DRAFT`
2. Pro soumet son profil → `verificationStatus: PENDING`
3. Admin examine et approuve → `verificationStatus: VERIFIED`
4. Badge ✅ s'affiche sur le profil

### Schéma Base de Données

```prisma
enum VerificationStatus {
  DRAFT      // Profil en brouillon
  PENDING    // En attente de vérification
  VERIFIED   // Vérifié ✅
  REJECTED   // Rejeté
  SUSPENDED  // Suspendu
}

enum ProfileBadgeType {
  VERIFIED          // Badge vérifié ✅ (accordé si verificationStatus == VERIFIED)
  PARTNER           // Badge partenaire 🟦 (accordé manuellement par admin)
  TOP_CONTRIBUTOR   // Badge top contributeur ⭐ (accordé manuellement par admin)
}

model MarketplaceProfile {
  // Ancien système (deprecated)
  isVerified Boolean @default(false)
  
  // Nouveau système
  verificationStatus VerificationStatus @default(DRAFT)
  verifiedAt         DateTime?
  verifiedById       String?
  verifiedBy         User? @relation("ProfileVerifier", fields: [verifiedById], references: [id])
  rejectionReason    String?
  
  // Badges additionnels (PARTNER, TOP_CONTRIBUTOR)
  badgesJson         Json?  // ["PARTNER", "TOP_CONTRIBUTOR"]
}

model User {
  // Relation pour les profils vérifiés par cet admin
  verifiedProfiles MarketplaceProfile[] @relation("ProfileVerifier")
}
```

### API Modifications

Les endpoints `/api/marketplace/professionals` et `/api/marketplace/professionals/[id]` retournent maintenant :

```json
{
  "isVerified": false,           // Legacy (deprecated)
  "verificationStatus": "VERIFIED",
  "badges": ["VERIFIED", "PARTNER"]
}
```

### Composants Frontend

#### `VerifiedBadge`

Badge de vérification standalone.

**Props** :
- `verificationStatus: VerificationStatus` (requis)
- `badges?: ProfileBadgeType[] | null` (optionnel)
- `size?: "sm" | "md" | "lg"` (défaut: `"md"`)
- `showPending?: boolean` (défaut: `false`)

**Usage** :
```tsx
<VerifiedBadge 
  verificationStatus="VERIFIED"
  badges={["PARTNER", "TOP_CONTRIBUTOR"]}
  size="md"
/>
```

**Rendu** :
- ✅ Badge vérifié (bleu) si `VERIFIED`
- 🟦 Badge partenaire si `PARTNER` dans badges
- ⭐ Badge top contributeur si `TOP_CONTRIBUTOR` dans badges
- "En vérification" badge si `PENDING` et `showPending={true}`
- Rien si `DRAFT`, `REJECTED`, ou `SUSPENDED`

#### `VerifiedBadgeInline`

Badges inline pour afficher à côté d'un nom.

**Props** :
- `verificationStatus: VerificationStatus`
- `badges?: ProfileBadgeType[] | null`

**Usage** :
```tsx
<h2>
  Jean Dupont
  <VerifiedBadgeInline 
    verificationStatus="VERIFIED"
    badges={["VERIFIED", "PARTNER"]}
  />
</h2>
```

### Intégrations

| Composant | Badge affiché |
|-----------|---------------|
| `MarketplaceProfile` (détail) | ✅ |
| `MarketplaceList` (liste) | ✅ |
| Profils utilisateurs | ⏳ À venir |
| Réseau pro | ⏳ À venir |

## 🔐 Sécurité

### Présence en ligne

- ✅ POST `/api/presence/heartbeat` : Auth requise
- ✅ GET `/api/presence` : Pas d'auth (données publiques comme "vu il y a X min")
- ✅ Pause automatique si onglet caché
- ✅ Limite de 100 userIds par requête

### Vérification

- ⚠️ **V1** : Pas encore d'interface admin pour gérer les vérifications
- 🔒 Seul un admin peut modifier `verificationStatus` → `VERIFIED`
- 🔒 `verifiedById` trace quel admin a vérifié
- 🔒 Impossible de se vérifier soi-même

**TODO V2** :
- Interface admin pour examiner les demandes PENDING
- Workflow d'approbation/rejet
- Historique des vérifications
- Notifications aux pros lors de changement de statut

## 📊 Performance

### Présence

**Charge base de données** :
- 1 UPDATE par utilisateur connecté toutes les 30s
- 1 SELECT avec WHERE IN pour récupérer statuts (cache côté client 30s)

**Optimisations** :
- Index sur `User.lastSeenAt` recommandé si > 10k utilisateurs actifs
- Cache côté serveur possible (Redis) pour scaling

**Charge réseau** :
- ~100 bytes par heartbeat
- 2 requêtes/min par utilisateur (heartbeat + refresh status)

### Vérification

**Charge** : 
- Pas d'impact (données statiques, changent rarement)
- SELECT JOIN simple pour récupérer verifiedBy

## 🧪 Tests

### Test manuel - Présence

1. Ouvrir 2 onglets avec 2 comptes différents
2. Naviguer sur page marketplace
3. Vérifier que le point vert 🟢 apparaît sur l'avatar de l'utilisateur actif
4. Fermer l'onglet → attendre 2 min → point vert disparaît

### Test manuel - Vérification

1. En tant qu'admin : Utiliser Prisma Studio pour modifier un `MarketplaceProfile`
   ```sql
   UPDATE "MarketplaceProfile" 
   SET "verificationStatus" = 'VERIFIED'
   WHERE "userId" = 'xxx';
   ```
2. Vérifier que le badge ✅ apparaît sur le profil marketplace

## 📦 Migration

Migration appliquée : `20260206015353_add_presence_and_verification`

**Changements** :
- Ajout colonnes `User.lastSeenAt`, `User.statusManual`
- Ajout colonnes `MarketplaceProfile.verificationStatus`, `verifiedAt`, `verifiedById`, `rejectionReason`, `badgesJson`
- Ajout enums `VerificationStatus`, `ProfileBadgeType`

**Rollback** : Supprimer les colonnes (data loss)

## 🚀 Déploiement

1. ✅ Migration Prisma appliquée
2. ✅ Build production réussi
3. ✅ Push GitHub effectué
4. ⏳ Vercel déploiement automatique

**Vérifications post-déploiement** :
- [ ] Heartbeat fonctionne (console network tab)
- [ ] Indicateurs verts apparaissent
- [ ] Badges de vérification affichés

## 🔄 Prochaines étapes (V2)

### Présence
- [ ] Afficher "vu il y a X min" au hover de l'avatar
- [ ] Status manuel (busy/away/disponible)
- [ ] Liste "Qui est en ligne" dans sidebar
- [ ] Notifications quand un contact passe en ligne

### Vérification
- [ ] Interface admin pour gérer les demandes
- [ ] Workflow de soumission pour les pros
- [ ] Notifications email lors de VERIFIED/REJECTED
- [ ] Critères de vérification documentés
- [ ] Badge PARTNER workflow
- [ ] Badge TOP_CONTRIBUTOR basé sur métriques

## 📝 Notes techniques

### Choix d'architecture

**Heartbeat vs WebSockets** :
- ✅ Heartbeat : Compatible Vercel (serverless), simple, reliable
- ❌ WebSockets : Nécessite serveur stateful, complexe, coûteux sur Vercel

**Polling interval** :
- 30s = bon équilibre entre réactivité et charge serveur
- Seuil 2 min = tolérance si 1-2 heartbeats ratés

**Champ statusManual** :
- Préparé pour V2 (busy/away/disponible)
- Pas encore utilisé dans l'UI

---

**Auteur** : GitHub Copilot  
**Date** : 6 février 2026  
**Version** : 1.0  
**Status** : ✅ Production Ready
