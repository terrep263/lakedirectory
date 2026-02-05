import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const businessCount = await prisma.business.count();
    console.log('Total Business records:', businessCount);

    const pageCount = await prisma.businessPage.count();
    console.log('Total BusinessPage records:', pageCount);

    // Find businesses without pages
    const businessesWithoutPages = await prisma.business.findMany({
      where: {
        businessPage: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
      take: 10,
    });

    console.log(`\nBusinesses without BusinessPages: ${businessesWithoutPages.length}`);
    if (businessesWithoutPages.length > 0) {
      console.log('\nFirst 10 orphaned businesses:');
      businessesWithoutPages.forEach((b) => {
        console.log(`  - ${b.name} (${b.id})`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
