import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const totalCount = await prisma.business.count();
  console.log('Total businesses:', totalCount);

  // Check all ingestion sources
  const sources = await prisma.business.groupBy({
    by: ['ingestionSource'],
    _count: true
  });

  console.log('\nAll ingestion sources:', JSON.stringify(sources, null, 2));

  // Sample a few businesses
  const sample = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      ingestionSource: true,
      externalPlaceId: true,
      phone: true,
      formattedAddress: true,
      description: true,
      logoUrl: true,
    },
    take: 3
  });

  console.log('\nSample businesses:', JSON.stringify(sample, null, 2));

  await prisma.$disconnect();
  process.exit(0);
}

check();
