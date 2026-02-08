import type { Metadata } from "next";
import Script from "next/script";

import "./pub.css";

import { BrandMark } from "@/components/ui/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileCheck,
  Home as HomeIcon,
  MapPin,
  Shield,
  Users,
} from "lucide-react";

import { PubContactForm } from "@/app/pub/pub-contact-form";

export const metadata: Metadata = {
  title: "CAPITUNE — Orientation & accompagnement vers le Canada",
  description:
    "Landing CAPITUNE: une plateforme claire et responsable pour structurer votre projet Canada (parcours, communauté encadrée, pros validés).",
  openGraph: {
    title: "CAPITUNE — Orientation & accompagnement vers le Canada",
    description:
      "Une plateforme claire et responsable pour structurer votre projet Canada (parcours, communauté encadrée, pros validés).",
    url: "https://www.capitune.com/pub",
    siteName: "CAPITUNE",
    type: "website",
    images: [
      {
        url: "https://www.capitune.com/brand/capitune-logo.png",
        alt: "CAPITUNE",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "CAPITUNE — Orientation & accompagnement vers le Canada",
    description:
      "Une plateforme claire et responsable pour structurer votre projet Canada (parcours, communauté encadrée, pros validés).",
    images: ["https://www.capitune.com/brand/capitune-logo.png"],
  },
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const fbPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export default function PubPage() {
  return (
    <div className="min-h-dvh">
      {gaMeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');
`,
            }}
          />
        </>
      ) : null}

      {fbPixelId ? (
        <>
          <Script
            id="fb-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${fbPixelId}');
fbq('track', 'PageView');
`,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(fbPixelId)}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <BrandMark showText title="CAPITUNE" subtitle="Orientation vers le Canada" className="flex items-center gap-3" />

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#comment-ca-marche" className="text-sm font-semibold text-muted hover:text-primary">
              Comment ça marche
            </a>
            <a href="#avantages" className="text-sm font-semibold text-muted hover:text-primary">
              Avantages
            </a>
            <a href="#temoignages" className="text-sm font-semibold text-muted hover:text-primary">
              Témoignages
            </a>
            <a href="#contact" className="text-sm font-semibold text-muted hover:text-primary">
              Contact
            </a>
            <a href="#contact" className={buttonLinkClassName("sm", "primary")}>
              Commencer
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="pub-hero relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
          <div className="absolute inset-0 bg-linear-to-br from-background/95 via-background/85 to-background/95" />

          <div className="relative mx-auto w-full max-w-6xl px-4">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Plateforme certifiée et sécurisée
                </div>

                <h1 className="text-4xl font-semibold text-navy md:text-5xl lg:text-6xl">
                  Votre projet d&apos;immigration au{" "}
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-navy">
                    Canada
                  </span>
                </h1>

                <p className="max-w-2xl text-base text-muted leading-7 md:text-lg">
                  Capitune structure et accompagne votre projet d&apos;immigration dans un cadre sécurisé et responsable.
                  Des professionnels vérifiés, un suivi structuré, des résultats concrets.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a href="#contact" className={buttonLinkClassName("md", "primary", "text-base px-6")}
                  >
                    Obtenir une orientation gratuite
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <a href="#comment-ca-marche" className={buttonLinkClassName("md", "outline", "text-base px-6")}>
                    Comment ça marche
                  </a>
                </div>

                <div className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Sans engagement
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Réponse sous 48h
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    100% confidentiel
                  </div>
                </div>
              </div>

              <div className="relative hidden lg:col-span-5 lg:block">
                <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
                <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-white/60 py-10">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
            <Stat value="2,500+" label="Dossiers accompagnés" />
            <Stat value="92%" label="Taux de réussite" />
            <Stat value="150+" label="Professionnels vérifiés" />
            <Stat value="48h" label="Délai de réponse" />
          </div>
        </section>

        <section id="comment-ca-marche" className="py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold text-navy md:text-4xl">Un processus simple et structuré</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-muted leading-7">
                De votre première demande jusqu&apos;à votre arrivée au Canada, nous vous accompagnons à chaque étape.
              </p>
            </div>

            <div className="grid items-center gap-6 md:grid-cols-2">
              <div className="order-2 md:order-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://private-us-east-1.manuscdn.com/sessionFile/xENE0cTd5KCGJa0O1Guzgl/sandbox/LFPuHc5DH28vla5x8jguaX-img-2_1770518552000_na1fn_Y2FuYWRhLWpvdXJuZXk.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUveEVORTBjVGQ1S0NHSmEwTzFHdXpnbC9zYW5kYm94L0xGUHVIYzVESDI4dmxhNXg4amd1YVgtaW1nLTJfMTc3MDUxODU1MjAwMF9uYTFmbl9ZMkZ1WVdSaExXcHZkWEp1WlhrLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=DdSuxANeqnPqJVy3nI06M6rq0gQHXWkLCyB51HoGNRZAb76Gscc90E457AM1LuyL-m49gv9bsOtOa9HYPNGDQctPD0sQPzCH-d9NzJGQcpO4zeeVUZgTYzLTm39Qkw0k7E2Hn1XZOOa6gqVp~1-0gOevwYn48BsGgQcFmnxwqVi6xAG6riCiFvm2-JRsiCggUkjvyX73uoxWLSM~8xJNMVweKFgCrOS26fheJyhiKmdXkhm-AK-dhLwVAzbCk85HezqSX3DJ3K9Hs4iI2zH1q2~rzOQCuf7o3NvG5db~Cd1p~a6cRBvuicwb0BR-~HcZSmtoC~3SHD~SuC0-tszISQ__"
                  alt="Parcours d'immigration au Canada"
                  className="h-auto w-full rounded-(--radius-md) border border-border"
                />
              </div>

              <div className="order-1 space-y-4 md:order-2">
                <HowItem
                  icon={<FileCheck className="h-6 w-6 text-primary" />}
                  title="1. Évaluation initiale gratuite"
                  desc="Remplissez notre formulaire court. Nous analysons votre profil et vous orientons vers les meilleures options sans engagement."
                />
                <HowItem
                  icon={<Briefcase className="h-6 w-6 text-primary" />}
                  title="2. Mise en relation avec un professionnel vérifié"
                  desc="Nous vous connectons avec un consultant en immigration certifié (RCIC) adapté à votre projet et votre situation."
                />
                <HowItem
                  icon={<HomeIcon className="h-6 w-6 text-primary" />}
                  title="3. Accompagnement structuré jusqu'à l'arrivée"
                  desc="Suivi transparent de votre dossier, préparation des documents, conseils personnalisés et support continu."
                />
              </div>
            </div>
          </div>
        </section>

        <section id="avantages" className="bg-linear-to-br from-primary/5 via-background to-primary/5 py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold text-navy md:text-4xl">La différence Capitune</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-muted leading-7">
                Nous ne vendons pas de rêves. Nous structurons des projets réalistes avec des professionnels de confiance.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <AdvCard
                icon={<Shield className="h-8 w-8 text-primary" />}
                title="Professionnels vérifiés"
                desc="Tous nos consultants sont certifiés RCIC (Regulated Canadian Immigration Consultants) et membres en règle du CICC."
                items={["Vérification des certifications", "Assurance responsabilité professionnelle", "Code de déontologie strict"]}
              />
              <AdvCard
                icon={<FileCheck className="h-8 w-8 text-primary" />}
                title="Suivi structuré et transparent"
                desc="Plateforme de suivi en ligne pour visualiser l'avancement de votre dossier en temps réel, sans surprise."
                items={["Tableau de bord personnalisé", "Notifications à chaque étape", "Documents sécurisés en ligne"]}
              />
              <AdvCard
                icon={<Users className="h-8 w-8 text-primary" />}
                title="Approche responsable"
                desc="Pas de promesses irréalistes. Nous évaluons honnêtement vos chances et vous guidons vers les voies légales adaptées."
                items={["Évaluation réaliste de votre profil", "Conformité totale avec les lois canadiennes", "Transparence sur les délais et coûts"]}
              />
            </div>

            <div className="mt-10 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/xENE0cTd5KCGJa0O1Guzgl/sandbox/LFPuHc5DH28vla5x8jguaX-img-3_1770518551000_na1fn_cHJvZmVzc2lvbmFsLXZlcmlmaWNhdGlvbg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUveEVORTBjVGQ1S0NHSmEwTzFHdXpnbC9zYW5kYm94L0xGUHVIYzVESDI4dmxhNXg4amd1YVgtaW1nLTNfMTc3MDUxODU1MTAwMF9uYTFmbl9jSEp2Wm1WemMybHZibUZzTFhabGNtbG1hV05oZEdsdmJnLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=H9MM5EnY1tXY9wumbSzqTfJcRyC3lHpetVY3u1qevqHzHBDXtDVZ12Uksl6bfyfmYaT3pBtU8LMubg3fWtdZSd95dbljLfUF95t3UKA2x-kvXa7oLU5isRA5tBs64X9AsiLDOUk-Mq73~T-6VkFJET0t-KNgAn0Q6l60yi34kjfvBm0M~UOvj9g-sI8q2JZfPdjsUqVSlTKtz18ByRL2rEU5nx6imImWC4Y53lXa6hG5Avcn9nVFF9fe1i1Bn~prkIVnJDrstmnDv0kck~zsf1q5XxjwNgWkb5YxDCX4OKUek124KdA4rZDE08lZRe6VcmT0KBWXF9UsqWWoJ2UJ~w__"
                alt="Professionnels vérifiés"
                className="mx-auto h-48 w-48 object-contain"
              />
            </div>
          </div>
        </section>

        <section id="temoignages" className="py-16 md:py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold text-navy md:text-4xl">Ils ont réussi leur projet avec Capitune</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-muted leading-7">
                Des histoires réelles de personnes qui ont concrétisé leur projet canadien.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Testimonial initials="AM" title="Amina M." subtitle="Travailleuse qualifiée - Montréal">
                &quot;Capitune m&apos;a mise en contact avec une consultante exceptionnelle qui a structuré mon dossier Entrée Express.
                En 8 mois, j&apos;ai obtenu ma résidence permanente. Le suivi était transparent et professionnel du début à la fin.&quot;
              </Testimonial>
              <Testimonial initials="KD" title="Karim D." subtitle="Entrepreneur - Toronto">
                &quot;J&apos;avais essayé seul pendant 2 ans sans succès. Avec Capitune, j&apos;ai compris mes erreurs et obtenu mon permis de travail
                en 4 mois. L&apos;investissement en vaut vraiment la peine pour éviter les refus.&quot;
              </Testimonial>
              <Testimonial initials="SF" title="Sarah F." subtitle="Étudiante - Vancouver">
                &quot;L&apos;évaluation gratuite m&apos;a permis de comprendre mes options. Le consultant m&apos;a aidée à choisir le bon programme d&apos;études
                et à préparer ma demande de permis. Tout s&apos;est fait en ligne, c&apos;était très pratique.&quot;
              </Testimonial>
              <Testimonial initials="MR" title="Mohamed R." subtitle="Regroupement familial - Ottawa">
                &quot;Le processus de parrainage semblait compliqué. Capitune m&apos;a rassuré et guidé à chaque étape.
                Ma famille est maintenant avec moi au Canada grâce à leur accompagnement professionnel.&quot;
              </Testimonial>
            </div>

            <div className="mt-10 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/xENE0cTd5KCGJa0O1Guzgl/sandbox/LFPuHc5DH28vla5x8jguaX-img-4_1770518552000_na1fn_c3VjY2Vzcy1zdG9yaWVz.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUveEVORTBjVGQ1S0NHSmEwTzFHdXpnbC9zYW5kYm94L0xGUHVIYzVESDI4dmxhNXg4amd1YVgtaW1nLTRfMTc3MDUxODU1MjAwMF9uYTFmbl9jM1ZqWTJWemN5MXpkRzl5YVdWei5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dO4lBPy-p4ng2wlAjDCgCVjxBNDDL2QfC~xCT2drL3udhyLYFihdsH52AGVawSVHYhAh2o70-NT00pK8X9th7ZRe9KnIvaePHBiHQpDi3vucDj~aVOnEBs3Z2vReLEPSpyPAWcwMTcud6YvKkU5I3ocKNu7NvvB4OWNGADOjAs3Prq4OzLye0~I2kj91gAUDKrj32cAgB5QPsSXvt1woamN9o6rJ5K2Q8wx0CfXL9D7CaaGnMT0ilFNIpEctEip5wDG-XBwqX35IztYtcQ1UeObeODfvKgoF-46070xM0h9liZ-cCguLoICVAF3B50hh5fDD13iiJm3QUd5u6CnR0A__"
                alt="Histoires de succès"
                className="mx-auto h-auto w-full max-w-3xl rounded-(--radius-md) border border-border"
              />
            </div>
          </div>
        </section>

        <section id="contact" className="bg-linear-to-br from-primary/5 via-background to-primary/5 py-16 md:py-24">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-navy md:text-4xl">Prêt à démarrer votre projet ?</h2>
              <p className="mt-3 text-base text-muted leading-7">
                Remplissez ce formulaire court pour obtenir une première orientation gratuite et sans engagement.
                Notre équipe vous contactera sous 48h pour analyser votre situation.
              </p>

              <div className="mt-6 space-y-4">
                <Bullet title="Évaluation personnalisée" desc="Analyse de votre profil et de vos objectifs" />
                <Bullet title="Options adaptées" desc="Recommandations de programmes d'immigration" />
                <Bullet title="Mise en relation" desc="Connexion avec un consultant certifié si pertinent" />
              </div>

              <div className="mt-8 hidden lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://private-us-east-1.manuscdn.com/sessionFile/xENE0cTd5KCGJa0O1Guzgl/sandbox/LFPuHc5DH28vla5x8jguaX-img-5_1770518548000_na1fn_Zm9ybS1pbGx1c3RyYXRpb24.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUveEVORTBjVGQ1S0NHSmEwTzFHdXpnbC9zYW5kYm94L0xGUHVIYzVESDI4dmxhNXg4amd1YVgtaW1nLTVfMTc3MDUxODU0ODAwMF9uYTFmbl9abTl5YlMxcGJHeDFjM1J5WVhScGIyNC5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ThBoxZ6xCTlNSpqiDmnWT~yfrPTtrMbY-MHzu2eXkXKQ-tphcRrdmGElA2TqhzTWkAG9YHP0iqAGDGGnVMYjqfsUZxyeq1bHNiqvp3tgdLI5fMLvHx8U4eSFs9hBiRhA6j8sfHeuRenzH2OUEoUI9edbVTpNn-9WvG7AATaD4krBg3KIDNjyo32CQG-2-VQ0nsLja6hJCWgTJYhrToeqfrOLxHRZMnzcr8C9buhxezWPQ4jtiH9KlZ6S139d20kgB25x-Nqh0mCfpmcgCfwumfD2IWI0-K-irr32d4iln0QpOv55XtWJJ--wRic24RARSs-3EzBqdptBe6evFxy8lw__"
                  alt="Formulaire de contact"
                  className="mx-auto w-full max-w-md"
                />
              </div>
            </div>

            <Card className="border-border bg-white/75">
              <CardHeader className="space-y-1">
                <CardTitle>Demande d&apos;orientation gratuite</CardTitle>
                <CardDescription>Retour garanti sous 48h</CardDescription>
              </CardHeader>
              <CardContent>
                <PubContactForm />
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t border-border bg-white/60 py-12">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-(--radius-md) bg-primary/12">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm font-semibold text-navy">Capitune</div>
                </div>
                <p className="mt-3 text-sm text-muted leading-6">
                  Votre partenaire de confiance pour structurer et réussir votre projet d&apos;immigration au Canada.
                </p>
              </div>

              <div>
                <div className="text-sm font-semibold text-navy">Navigation</div>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li><a href="#comment-ca-marche" className="hover:text-primary">Comment ça marche</a></li>
                  <li><a href="#avantages" className="hover:text-primary">Avantages</a></li>
                  <li><a href="#temoignages" className="hover:text-primary">Témoignages</a></li>
                  <li><a href="#contact" className="hover:text-primary">Contact</a></li>
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold text-navy">Légal</div>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li><a href="#" className="hover:text-primary">Mentions légales</a></li>
                  <li><a href="#" className="hover:text-primary">Politique de confidentialité</a></li>
                  <li><a href="#" className="hover:text-primary">Conditions d&apos;utilisation</a></li>
                  <li><a href="#" className="hover:text-primary">RGPD</a></li>
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold text-navy">Contact</div>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li>Email: contact@capitune.com</li>
                  <li>Téléphone: +33 1 23 45 67 89</li>
                  <li>Lun-Ven: 9h-18h (heure de Paris)</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">
              <p>© 2026 Capitune. Tous droits réservés. Capitune n&apos;est pas affilié au gouvernement du Canada.</p>
              <p className="mt-2">Nos consultants partenaires sont membres du Conseil de réglementation des consultants en immigration du Canada (CICC).</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function buttonLinkClassName(
  size: "sm" | "md",
  variant: "primary" | "outline",
  extra?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    size === "sm" ? "h-9 px-3" : "h-10 px-4",
    variant === "primary" &&
      "bg-primary text-white border border-primary/25 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm",
    variant === "outline" &&
      "bg-white/80 text-text border border-border shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-px active:translate-y-0",
    extra,
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-semibold text-primary md:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}

function HowItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div>
        <div className="text-base font-semibold text-navy">{title}</div>
        <div className="mt-1 text-sm text-muted leading-6">{desc}</div>
      </div>
    </div>
  );
}

function AdvCard({
  icon,
  title,
  desc,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  items: string[];
}) {
  return (
    <Card className="bg-white/75">
      <CardHeader>
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-(--radius-md) bg-primary/10">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-sm text-muted leading-6">{desc}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-text">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span className="text-muted">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Testimonial({
  initials,
  title,
  subtitle,
  children,
}: {
  initials: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white/75">
      <CardContent className="pt-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-text">{title}</div>
            <div className="text-xs text-muted">{subtitle}</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-muted italic leading-6">{children}</div>
      </CardContent>
    </Card>
  );
}

function Bullet({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-1 h-5 w-5 text-primary" />
      <div>
        <div className="text-sm font-semibold text-text">{title}</div>
        <div className="text-sm text-muted">{desc}</div>
      </div>
    </div>
  );
}
