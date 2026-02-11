"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface DocumentUploadButtonProps {
  docId: string;
  status: string; // "Validé", "En revue", "À fournir"
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function DocumentUploadButton({ docId, status, variant = "outline", label, size = "sm" }: DocumentUploadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = status === "Validé" || isPending || isUploading;

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/dossier/documents/${docId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erreur lors de l'upload");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion");
    } finally {
        setIsUploading(false);
        // Reset input for re-selection
        if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        disabled={isDisabled}
      />
      <Button 
        size={size} 
        variant={variant} 
        disabled={isDisabled}
        onClick={handleClick}
      >
        {isUploading ? "Envoi..." : (label ?? (status === "À fournir" ? "Déposer" : "Remplacer"))}
      </Button>
    </>
  );
}
