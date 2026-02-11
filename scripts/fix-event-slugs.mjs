import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DÉBUT DE LA RÉPARATION DES ÉVÉNEMENTS ---');
  
  // 1. Forcer le statut PUBLISHED pour tous les événements existants
  const updateStatus = await prisma.$executeRaw`UPDATE "Event" SET status = 'PUBLISHED' WHERE status IS NULL OR status = 'DRAFT'`;
  console.log(`${updateStatus} événements mis à jour en PUBLISHED.`);

  // 2. Trouver les événements sans slug
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });

  console.log(`Trouvé ${events.length} événements sans slug.`);

  for (const event of events) {
    const baseSlug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const randomSuffix = randomBytes(3).toString('hex');
    const newSlug = `${baseSlug || 'session'}-${randomSuffix}`;

    await prisma.event.update({
      where: { id: event.id },
      data: { slug: newSlug }
    });
    console.log(`Slug généré : ${event.title} -> ${newSlug}`);
  }

  console.log('--- FIN DE LA RÉPARATION ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
