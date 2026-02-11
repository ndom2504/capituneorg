"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransition } from "react";
import { submitPreRegistration } from "@/app/(dashboard)/pre-inscription/actions";

export function PreRegistrationForm({ initialData }: { initialData?: any }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
        await submitPreRegistration(formData);
    });
  }

  return (
    <Card className="max-w-xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Préinscription</CardTitle>
        <CardDescription>
          Complétez ces informations pour nous permettre d'analyser votre profil.
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Quel est votre objectif principal ?</label>
                <select 
                    name="mainObjective" 
                    defaultValue={initialData?.mainObjective ?? ""}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                >
                    <option value="" disabled>Sélectionner...</option>
                    <option value="ETUDIER">Étudier</option>
                    <option value="TRAVAILLER">Travailler</option>
                    <option value="ENTREPRENEUR">Entreprendre</option>
                    <option value="FAMILLE">Rejoindre ma famille</option>
                    <option value="EXPLORER">Explorer / Visiter</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Message ou précisions</label>
                <textarea 
                    name="message"
                    defaultValue={initialData?.message ?? ""}
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-none"
                    placeholder="Décrivez brièvement votre projet..."
                />
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => window.history.back()}>
                Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
                {isPending ? "Envoi..." : "Valider ma préinscription"}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
