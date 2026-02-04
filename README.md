This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Base de données (PostgreSQL + Prisma)

Le projet utilise Prisma. En production (Vercel), **SQLite n’est pas adapté** (filesystem éphémère). Le schéma est donc configuré pour **PostgreSQL**.

### Variable d’environnement

- `DATABASE_URL` : URL Postgres (runtime Prisma Client)
- `DIRECT_URL` : URL Postgres non poolée (recommandée pour `prisma migrate deploy`)
	- Exemple: `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require`

### Migrations

- En dev/local: `npm run db:migrate`
- En prod: `npm run db:deploy`

## Google Auth (Firebase)

CAPITUNE supporte la connexion Google via Firebase Authentication.

### 1) Console Firebase

- Activer **Authentication → Sign-in method → Google**
- Ajouter vos domaines dans **Authentication → Settings → Authorized domains**

### 2) Variables d’environnement

Configurer ces variables (ex: dans `.env.local` ou dans Vercel). Les variables `NEXT_PUBLIC_*` sont nécessaires côté navigateur.

Client (public):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Optionnel: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Server (Firebase Admin) – 1 des 2 options:

- Option A (recommandée): `FIREBASE_ADMIN_CREDENTIALS_B64` = JSON service account encodé en base64
- Option B: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (avec `\n` si nécessaire)

### 3) Démarrage

- La page de connexion est sur `/auth`.
- Le backend vérifie le token via Firebase Admin et crée une session cookie (même mécanisme que l’auth locale).

## Paiements (Stripe)

Le module Paiements est transversal (Marketplace → Demande → Client → Dossier). La **source de vérité** d’un paiement est le **webhook Stripe**.

Spécification V2 (marketplace) : voir [docs/stripe-connect-v2-spec.md](docs/stripe-connect-v2-spec.md).

### Variables d’environnement

- `STRIPE_SECRET_KEY` : clé secrète Stripe (server)
- `STRIPE_WEBHOOK_SECRET` : secret de signature du webhook (server)

### Endpoints

- `POST /api/payments/orders` : (pro) crée une commande liée à une demande Marketplace
- `POST /api/payments/checkout` : (demandeur) crée une Checkout Session Stripe et renvoie `{ url }`
- `POST /api/webhooks/stripe` : webhook Stripe (à configurer dans Stripe Dashboard)

### Configuration webhook (Railway / prod)

- URL à déclarer dans Stripe: `https://<votre-domaine>/api/webhooks/stripe`
- Événements minimum: `checkout.session.completed` (optionnel: `checkout.session.async_payment_succeeded`)

### Test local (Stripe CLI)

1) Exporter vos variables:

- `STRIPE_SECRET_KEY`

2) Lancer l’écoute webhook et récupérer le secret:

```bash
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe
```

La commande affiche un `whsec_...` à copier dans `STRIPE_WEBHOOK_SECRET`.

3) Tester le flux:

- Côté pro: créer une demande de paiement (order)
- Côté demandeur: cliquer “Payer maintenant” → Checkout Stripe
- Vérifier en base: `PaymentOrder.status` devient `PAID` après webhook

Note: si Stripe n’est pas configuré, `POST /api/payments/checkout` renvoie `501`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
