import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check featured businesses in Business table
    const featuredBusinesses = await prisma.business.findMany({
      where: { isFeatured: true },
      select: {
        id: true,
        name: true,
        isFeatured: true,
        featuredAt: true,
      },
    });

    console.log(`Featured businesses in Business table: ${featuredBusinesses.length}`);
    if (featuredBusinesses.length > 0) {
      console.log('\nFeatured businesses:');
      featuredBusinesses.forEach((b) => {
        console.log(`  - ${b.name} (featured at: ${b.featuredAt})`);
      });
    }

    // Check featured pages in BusinessPage table
    const featuredPages = await prisma.businessPage.findMany({
      where: { isFeatured: true },
      select: {
        id: true,
        title: true,
        isFeatured: true,
        featuredAt: true,
        businessId: true,
      },
    });

    console.log(`\nFeatured pages in BusinessPage table: ${featuredPages.length}`);
    if (featuredPages.length > 0) {
      console.log('\nFeatured pages:');
      featuredPages.forEach((p) => {
        console.log(`  - ${p.title} (featured at: ${p.featuredAt})`);
      });
    }

    // Sync featured status from Business to BusinessPage
    if (featuredBusinesses.length > 0) {
      console.log('\n🔄 Syncing featured status from Business to BusinessPage...');
      
      for (const business of featuredBusinesses) {
        const page = await prisma.businessPage.findUnique({
          where: { businessId: business.id },
        });

        if (page && !page.isFeatured) {
          await prisma.businessPage.update({
            where: { id: page.id },
            data: {
              isFeatured: true,
              featuredAt: business.featuredAt || new Date(),
            },
          });
          console.log(`  ✅ Synced: ${business.name}`);
        }
      }
      
      console.log('\n✅ Sync complete!');
    } else {
      console.log('\n⚠️  No featured businesses found in Business table.');
      console.log('Use the admin panel to mark businesses as featured.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
