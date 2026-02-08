"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { ArrowRight } from "lucide-react";

type FormData = {
  nom: string;
  email: string;
  telephone: string;
  typeProjet: string;
  message: string;
};

export function PubContactForm({ className }: { className?: string }) {
  const [formData, setFormData] = useState<FormData>({
    nom: "",
    email: "",
    telephone: "",
    typeProjet: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.nom.trim() || !formData.email.trim() || !formData.telephone.trim()) {
      setStatus("error");
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setStatus("success");

    setFormData({
      nom: "",
      email: "",
      telephone: "",
      typeProjet: "",
      message: "",
    });
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {status === "success" ? (
        <div className="rounded-(--radius-md) border border-border bg-white/70 px-3 py-2 text-sm text-text">
          Demande envoyée ! Nous vous contacterons sous 48h.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-(--radius-md) border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="nom" className="text-sm font-medium text-navy">
          Nom complet <span className="text-red-600">*</span>
        </label>
        <Input
          id="nom"
          type="text"
          placeholder="Votre nom et prénom"
          value={formData.nom}
          onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-navy">
          Adresse email <span className="text-red-600">*</span>
        </label>
        <Input
          id="email"
          type="email"
          placeholder="votre@email.com"
          value={formData.email}
          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="telephone" className="text-sm font-medium text-navy">
          Numéro de téléphone <span className="text-red-600">*</span>
        </label>
        <Input
          id="telephone"
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={formData.telephone}
          onChange={(e) => setFormData((p) => ({ ...p, telephone: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="typeProjet" className="text-sm font-medium text-navy">
          Type de projet (optionnel)
        </label>
        <Input
          id="typeProjet"
          type="text"
          placeholder="Ex: Travailleur qualifié, Études, Entrepreneur…"
          value={formData.typeProjet}
          onChange={(e) => setFormData((p) => ({ ...p, typeProjet: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="text-sm font-medium text-navy">
          Décrivez brièvement votre situation (optionnel)
        </label>
        <Textarea
          id="message"
          placeholder="Parlez-nous de votre projet, votre profil, vos objectifs…"
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full text-base">
        Envoyer ma demande
        <ArrowRight className="h-5 w-5" />
      </Button>

      <p className="text-xs text-muted text-center leading-5">
        En soumettant ce formulaire, vous acceptez d’être contacté par Capitune ou l’un de nos
        partenaires certifiés. Vos données sont protégées et ne seront jamais partagées à des tiers.
      </p>
    </form>
  );
}
