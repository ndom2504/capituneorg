import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="bg-green-100 p-6 rounded-full mb-6">
        <CheckCircle2 className="w-20 h-20 text-green-600" />
      </div>
      <h1 className="text-3xl font-black text-navy mb-3">Paiement Confirmé ! 🚀</h1>
      <p className="text-muted text-lg max-w-md mb-8">
        Merci pour votre confiance. Votre place est officiellement réservée et votre accès à la session est maintenant débloqué.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/events">
          <Button variant="primary" size="md" className="bg-navy text-white px-8 h-12 text-base shadow-lg">
            Explorer d'autres sessions
          </Button>
        </Link>
        <Link href="/events">
          <Button variant="outline" size="md" className="border-navy text-navy font-bold h-12 px-8 text-base">
            Voir mes inscriptions
          </Button>
        </Link>
      </div>

      <p className="mt-12 text-xs text-muted">
        Un reçu détaillé a été envoyé à votre adresse e-mail par Stripe.
      </p>
    </div>
  );
}
