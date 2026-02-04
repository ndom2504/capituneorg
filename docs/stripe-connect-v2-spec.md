# CAPITUNE — Spec Paiements V2 (Stripe Connect)

Date : 2026-02-04

Objectif : faire évoluer le MVP (CAPITUNE encaisse via Stripe Checkout) vers une **vraie marketplace** où CAPITUNE orchestre paiements + reversements aux professionnels, avec **commission**, **onboarding**, et **déblocage métier** piloté par webhooks.

---

## 1) Résumé exécutif

- **MVP (déjà en place)** : Stripe Checkout, CAPITUNE encaisse, source de vérité = webhook.
- **V2** : Stripe Connect (pro = compte connecté), CAPITUNE prend une commission, reversement automatisé.
- **Principe non négociable** : les statuts métier (dossier/meeting/accès) se débloquent **uniquement** après événements webhook Stripe valides.

---

## 2) Décisions produit à figer (avant dev)

### 2.1 Merchant of Record (MoR)
Deux approches possibles :

1) **CAPITUNE MoR** (recommandé si CAPITUNE veut maîtriser facture/TVA/chargeback)
- CAPITUNE vend au demandeur.
- CAPITUNE reverse au pro (payout ou transfert) selon règles internes.

2) **Pro MoR** (recommandé si CAPITUNE veut être “intermédiaire” plus léger)
- Le pro vend au demandeur.
- CAPITUNE prélève une commission.

> Stripe Connect peut supporter les deux, mais le choix impacte conformité/fiscalité et wording factures.

### 2.2 Modèle Connect
Stripe propose plusieurs schémas. Pour CAPITUNE, on vise :

- **Destination charges** (souvent le plus simple pour marketplace + commission)
  - La charge est créée sur le compte de la plateforme.
  - Un `transfer_data[destination]` envoie les fonds au compte connecté.
  - `application_fee_amount` permet de prendre la commission CAPITUNE.

Alternative :
- **Separate charges and transfers** (plus flexible, mais plus d’états à gérer)

### 2.3 Moment de facturation
- **Avant le meeting** (réduit les no-shows) ou
- **Après acceptation / avant démarrage dossier** (aligné “paiement au milieu”) ou
- **Après meeting** (si meeting = diagnostic gratuit)

Dans tous les cas : le déblocage dossier/accès “client actif” doit dépendre d’un paiement confirmé.

---

## 3) Rôles & permissions (V2)

### Demandeur
- Peut payer une commande qui lui appartient.
- Peut voir ses paiements, factures/reçus et l’état de déblocage.

### Professionnel
- Peut créer une demande de paiement (commande) pour une demande qu’il gère.
- Peut voir les paiements des commandes liées à ses demandes/clients.
- Peut gérer son compte Stripe Connect (onboarding, statut, IBAN).

### Plateforme CAPITUNE
- Crée/maintient les Checkout Sessions / PaymentIntents.
- Reçoit et vérifie les webhooks.
- Applique les règles de commission.
- Déclenche les déblocages métier (dossier/meeting, accès, statut).

---

## 4) Flux V2 (end-to-end)

### 4.1 Onboarding Stripe Connect (Pro)
1) Pro clique “Configurer mes paiements”.
2) CAPITUNE crée (ou récupère) un `StripeAccount` connecté.
3) CAPITUNE génère un `accountLink` Stripe et redirige le pro.
4) Le pro complète KYC + informations bancaires.
5) CAPITUNE reçoit `account.updated` (webhook) et met à jour le statut d’éligibilité.

**Résultat** : le pro est “payable” (payouts activés) et peut recevoir des fonds.

### 4.2 Création d’une demande de paiement (Pro)
1) Pro sélectionne un service (catalogue) + montant (ou service à prix fixe) + conditions.
2) CAPITUNE crée une `PaymentOrder` en statut `PENDING_PAYMENT`.
3) CAPITUNE notifie le demandeur (UI + message système dans la demande).

### 4.3 Paiement (Demandeur)
1) Demandeur clique “Payer maintenant”.
2) CAPITUNE crée une Checkout Session / PaymentIntent en mode Connect.
3) Stripe confirme le paiement.

### 4.4 Déblocage métier (Webhook)
1) CAPITUNE reçoit l’événement (ex: `checkout.session.completed` / `payment_intent.succeeded`).
2) CAPITUNE vérifie signature + cohérence (orderId, montants, devise).
3) CAPITUNE marque `PaymentOrder` = `PAID` (idempotent).
4) CAPITUNE déclenche :
   - création/activation du dossier,
   - statut client actif,
   - autorisations et UI.

---

## 5) Webhooks : événements à gérer

Minimum viable V2 (recommandé) :
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded` (si remboursements)
- `account.updated` (Connect onboarding)

Règles clés :
- Toujours faire `constructEvent` avec `STRIPE_WEBHOOK_SECRET`.
- Idempotence : stocker les IDs Stripe traités et ignorer les doublons.
- Ne jamais débloquer sur un retour front `success_url`.

---

## 6) Modèle de données (évolution Prisma)

### 6.1 Nouveau modèle : StripeConnectedAccount
Ajouter un modèle dédié (suggestion) :

- `StripeConnectedAccount`
  - `id`
  - `userId` (propriétaire)
  - `stripeAccountId`
  - `chargesEnabled` / `payoutsEnabled`
  - `detailsSubmitted`
  - `requirementsDue` (JSON)
  - `createdAt` / `updatedAt`

### 6.2 Évolution PaymentService
- Ajouter : `providerUserId` (déjà présent dans l’idée du catalogue), et éventuellement
  - `stripeProductId` / `stripePriceId` (si on veut gérer catalogue côté Stripe plus tard)

### 6.3 Évolution PaymentOrder
Ajouter les champs nécessaires à Connect :
- `connectedAccountId` (FK → StripeConnectedAccount)
- `applicationFeeCents` (commission CAPITUNE)
- `stripeCheckoutSessionId` (déjà stocké côté Payment)
- `stripePaymentIntentId` (si on gère PaymentIntents)
- `status` (déjà)

### 6.4 Modèle Payment (événements)
Conserver l’historisation, et ajouter :
- `stripeEventId`
- `stripeEventType`
- `rawEvent` (JSON) optionnel

---

## 7) Règles de commission (V2)

Exemples (à valider produit) :
- Commission CAPITUNE = 10% (min 3$) ou fixe + variable.
- `application_fee_amount = commission`.

Attention :
- La commission est en cents, même devise que la commande.
- Conserver la règle en base au moment de la création d’order (audit).

---

## 8) APIs à ajouter (proposées)

### Connect onboarding
- `POST /api/payments/connect/account` (pro) : crée/récupère `stripeAccountId`.
- `POST /api/payments/connect/link` (pro) : crée `accountLink` et renvoie `{ url }`.
- `GET /api/payments/connect/status` (pro) : statut KYC / payouts.

### Orders / checkout (évolution)
- `POST /api/payments/orders` : inchangé côté fonctionnel, mais vérifie que le pro a un compte Connect “ready”.
- `POST /api/payments/checkout` : crée Checkout Session en mode Connect + commission.

---

## 9) Déblocages métier : mapping statuts → permissions

Recommandation simple :

- `PaymentOrder.PENDING_PAYMENT`
  - dossier : non actif (lecture limitée)
  - meeting : visible mais “verrouillé” si besoin
  - documents : dépôt possible ou non selon stratégie

- `PaymentOrder.PAID`
  - dossier : actif (EN_COURS)
  - communication encadrée : ouverte
  - meeting : confirmé / actions possibles

- `PaymentOrder.CANCELED` / `FAILED`
  - pas de déblocage

---

## 10) Migration depuis le MVP (rétrocompat)

- Garder `PaymentOrder`/`Payment` et leurs statuts.
- Ajouter Connect uniquement quand :
  - le pro a un `StripeConnectedAccount` prêt.
- Stratégie progressive :
  - Si pro non onboardé → rester en MVP (CAPITUNE encaisse) + reversement manuel.
  - Si pro onboardé → utiliser Connect automatiquement.

---

## 11) Observabilité & support

- Logger : `orderId`, `stripeEventId`, `sessionId`, `paymentIntentId`.
- Écran admin (plus tard) : liste paiements, anomalies (montant/devise mismatch), webhooks en erreur.
- Replays : possibilité de re-traiter un événement (idempotent) ou de resynchroniser via Stripe API.

---

## 12) Check-list d’implémentation (dev)

1) Ajouter modèle `StripeConnectedAccount`.
2) Ajouter routes Connect (create account, link, status).
3) Étendre `checkout` pour Connect : destination + fee.
4) Étendre webhook : `payment_intent.succeeded`, `account.updated`, refunds.
5) UI Pro : page “Paiements” / “Monétisation” + état onboarding.
6) UI Demandeur : affichage reçus et statut déblocage.

---

## 13) Variables d’environnement (V2)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Optionnel : `STRIPE_CONNECT_CLIENT_ID` (si usage OAuth Connect)

---

## 14) Questions ouvertes (à trancher)

- Meeting payant ou non ?
- Paiement unique vs paiements par étapes (milestones) ?
- Politique annulation/remboursement ?
- Facturation/TVA : CAPITUNE MoR ou Pro MoR ?
