import { PUB_FAQ_ITEMS } from "@/app/pub/faq-data";

export function PubFaq() {
  const categories = Array.from(new Set(PUB_FAQ_ITEMS.map((i) => i.category)));

  return (
    <section id="faq" className="bg-linear-to-b from-background via-white/60 to-background py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            Questions fréquentes
          </div>
          <h2 className="mt-4 text-3xl font-semibold text-navy md:text-4xl">Vos questions, nos réponses</h2>
          <p className="mt-3 text-base text-muted leading-7">
            Retrouvez les réponses aux questions les plus courantes sur l&apos;immigration au Canada. Si besoin,
            notre équipe peut vous orienter via le formulaire de contact.
          </p>
        </div>

        <div className="space-y-10">
          {categories.map((category) => {
            const items = PUB_FAQ_ITEMS.filter((i) => i.category === category);
            return (
              <div key={category} className="space-y-4">
                <h3 className="text-xl font-semibold text-navy md:text-2xl">{category}</h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-(--radius-md) border border-border bg-white/70 px-4 py-3"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
                        <span>{item.question}</span>
                        <span className="text-muted">+</span>
                      </summary>
                      <div className="mt-3 text-sm text-text/80 leading-6">{item.answer}</div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PUB_FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          }),
        }}
      />
    </section>
  );
}
