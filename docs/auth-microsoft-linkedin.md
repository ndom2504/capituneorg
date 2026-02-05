# Configuration de l'authentification Microsoft et LinkedIn

Ce guide explique comment configurer Firebase Authentication pour activer la connexion via Microsoft (Azure AD) et LinkedIn.

## Prérequis

- Accès à la console Firebase du projet Capitune
- Compte développeur Microsoft Azure (pour Microsoft Auth)
- Compte développeur LinkedIn (pour LinkedIn Auth)

## 1. Configuration Microsoft / Azure AD

### A. Dans Azure Portal

1. **Créer une inscription d'application**
   - Accéder à [Azure Portal](https://portal.azure.com)
   - Aller dans **Azure Active Directory** → **App registrations** → **New registration**
   - Nom: `Capitune Authentication`
   - Types de comptes pris en charge: **Comptes dans un annuaire organisationnel quelconque et comptes Microsoft personnels**
   - URI de redirection: 
     - Type: Web
     - URL: `https://[PROJECT_ID].firebaseapp.com/__/auth/handler` (remplacer [PROJECT_ID] par votre ID de projet Firebase)
   - Cliquer sur **Enregistrer**

2. **Obtenir les identifiants**
   - Copier l'**Application (client) ID**
   - Copier le **Directory (tenant) ID**

3. **Créer un secret client**
   - Aller dans **Certificates & secrets** → **New client secret**
   - Description: `Firebase Auth Secret`
   - Expiration: **24 months** (recommandé)
   - Copier la **Valeur** du secret (disponible une seule fois !)

4. **Configurer les permissions API**
   - Aller dans **API permissions**
   - Les permissions suivantes devraient être présentes :
     - Microsoft Graph → **openid**
     - Microsoft Graph → **profile**
     - Microsoft Graph → **email**

### B. Dans Firebase Console

1. **Activer le fournisseur Microsoft**
   - Accéder à [Firebase Console](https://console.firebase.google.com)
   - Sélectionner le projet Capitune
   - Aller dans **Authentication** → **Sign-in method**
   - Cliquer sur **Microsoft** → **Enable**

2. **Configurer les identifiants**
   - **Application (client) ID**: Coller l'ID copié depuis Azure
   - **Application (client) secret**: Coller le secret copié depuis Azure
   - Cliquer sur **Save**

3. **Ajouter les domaines autorisés**
   - Dans **Authentication** → **Settings** → **Authorized domains**
   - Ajouter:
     - `localhost` (pour développement)
     - `127.0.0.1` (pour développement)
     - Votre domaine de production (ex: `capitune.com`, `www.capitune.com`)

## 2. Configuration LinkedIn

### A. Dans LinkedIn Developers Portal

1. **Créer une application LinkedIn**
   - Accéder à [LinkedIn Developers](https://www.linkedin.com/developers/)
   - Cliquer sur **Create app**
   - Remplir les informations:
     - **App name**: Capitune
     - **LinkedIn Page**: Sélectionner la page LinkedIn de votre organisation
     - **App logo**: Logo Capitune (au moins 100x100px)
     - **Legal agreement**: Cocher les cases
   - Cliquer sur **Create app**

2. **Configurer l'application**
   - Accéder à l'onglet **Auth**
   - **Redirect URLs**: Ajouter
     - `https://[PROJECT_ID].firebaseapp.com/__/auth/handler` (remplacer [PROJECT_ID])
     - Pour développement: `http://localhost` si nécessaire

3. **Obtenir les identifiants**
   - Dans l'onglet **Auth**:
     - Copier le **Client ID**
     - Copier le **Client Secret**

4. **Demander l'accès aux produits**
   - Aller dans l'onglet **Products**
   - Demander l'accès à **Sign In with LinkedIn using OpenID Connect**
   - Ce produit est généralement approuvé instantanément

### B. Dans Firebase Console

**⚠️ IMPORTANT**: Firebase ne supporte pas directement LinkedIn via l'interface. Il faut utiliser un provider OIDC personnalisé.

1. **Créer un provider OIDC**
   - Dans **Authentication** → **Sign-in method**
   - Cliquer sur **Add new provider** → **OpenID Connect**
   - Configuration:
     - **Name**: `linkedin` (doit correspondre à `oidc.linkedin` dans le code)
     - **Client ID**: Coller le Client ID de LinkedIn
     - **Client Secret**: Coller le Client Secret de LinkedIn
     - **Issuer**: `https://www.linkedin.com/oauth`
     - **Enable**: Cocher la case
   - Cliquer sur **Save**

## 3. Variables d'environnement Firebase

Aucune variable d'environnement supplémentaire n'est nécessaire dans Next.js. Firebase utilise les mêmes variables que pour Google Auth :

```env
# Firebase Client (déjà configuré)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (déjà configuré)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

## 4. Test de l'intégration

### Test en local

1. Démarrer le serveur de développement:
   ```bash
   npm run dev
   ```

2. Accéder à `http://localhost:3001/auth`

3. Tester chaque méthode d'authentification:
   - Cliquer sur "Continuer avec Microsoft"
   - Cliquer sur "Continuer avec LinkedIn"
   - Vérifier que la redirection fonctionne
   - Vérifier que l'utilisateur est créé dans la base de données

### Vérification de la création d'utilisateur

Après une connexion réussie, vérifier dans la base de données Neon que:
- Un utilisateur a été créé avec le bon email
- Le champ `passwordHash` est `null` (authentification sociale uniquement)
- Le `fullName` et `avatarUrl` sont remplis si disponibles
- Si c'est un demandeur (`accountType: "USER"`), une préinscription a été créée

## 5. Déploiement en production

### A. Mise à jour des URIs de redirection

**Azure Portal (Microsoft)**:
- Ajouter l'URI de production: `https://[PROJECT_ID].firebaseapp.com/__/auth/handler`
- Ajouter votre domaine personnalisé si configuré: `https://capitune.com/__/auth/handler`

**LinkedIn Developers**:
- Ajouter l'URI de production dans **Redirect URLs**

### B. Firebase Authorized Domains

- Ajouter votre domaine de production dans Firebase Console → **Authentication** → **Settings** → **Authorized domains**

### C. Déploiement

```bash
git add .
git commit -m "feat: ajout authentification Microsoft et LinkedIn"
git push origin main
```

Vercel déploiera automatiquement les changements.

## 6. Dépannage

### Microsoft

**Erreur: "AADSTS50011: The reply URL specified in the request does not match"**
- Vérifier que l'URI de redirection dans Azure correspond exactement à celle de Firebase
- Format: `https://[PROJECT_ID].firebaseapp.com/__/auth/handler`

**Erreur: "Popup blocked"**
- L'utilisateur a bloqué les popups → la librairie utilise automatiquement la redirection

### LinkedIn

**Erreur: "redirect_uri_mismatch"**
- Vérifier que l'URL de redirection est correctement configurée dans LinkedIn Developers

**Erreur: "invalid_client"**
- Vérifier le Client ID et Client Secret dans Firebase Console

**Provider non trouvé**
- Vérifier que le nom du provider OIDC est exactement `linkedin` (sans espace)
- Le code utilise `oidc.linkedin` qui correspond au format Firebase OIDC

### Général

**Erreur: "Unauthorized domain"**
- Ajouter le domaine dans Firebase → **Authentication** → **Settings** → **Authorized domains**

**Token invalide**
- Vérifier que Firebase Admin SDK a les bonnes permissions
- Vérifier que le fichier `capituneorg-firebase-adminsdk-*.json` est présent et configuré via `FIREBASE_*` env vars

## 7. Sécurité

**Bonnes pratiques**:
- ✅ Ne jamais commit les secrets (Client Secret, Private Key)
- ✅ Utiliser des secrets différents pour dev/staging/prod
- ✅ Renouveler les secrets régulièrement (tous les 12-24 mois)
- ✅ Activer l'authentification multi-facteurs (MFA) pour les comptes admin
- ✅ Limiter les domaines autorisés aux seuls domaines nécessaires
- ✅ Surveiller les logs d'authentification dans Firebase Console

## 8. Limitations actuelles

1. **Comptes professionnels**: L'authentification sociale est principalement pour les demandeurs. Les professionnels doivent s'inscrire par email pour validation.

2. **Unification des comptes**: Si un utilisateur se connecte avec Google puis Microsoft avec le même email:
   - Firebase crée un seul `User` dans Firebase Auth
   - Notre base de données utilise l'email comme unique
   - Le premier provider qui se connecte "claim" l'email
   - Les connexions suivantes mettent à jour le profil (fullName, avatar) mais ne changent pas le `passwordHash` (reste `null`)

3. **Migration de compte**: Un utilisateur créé par email+password ne peut pas (actuellement) lier son compte à Microsoft ou LinkedIn. Cette fonctionnalité nécessiterait une page de settings permettant de "lier" les providers.

## Support

En cas de problème, vérifier:
1. Les logs Firebase Console → **Authentication** → **Users**
2. Les logs Vercel → **Deployments** → Logs
3. Les logs navigateur (Console DevTools)
4. La base de données Neon pour vérifier si l'utilisateur a bien été créé
