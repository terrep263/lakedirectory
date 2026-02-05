import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Syncing images: BusinessCore → Business → BusinessPage\n');

    // Get all BusinessCore records with images
    const coreRecords = await prisma.businessCore.findMany({
      where: {
        primaryImagePath: {
          not: 'placeholder.png',
        },
      },
    });

    console.log(`Found ${coreRecords.length} BusinessCore records with images\n`);

    let businessUpdated = 0;
    let pageUpdated = 0;

    for (const core of coreRecords) {
      try {
        // Find matching Business record (by ID or name)
        let business = await prisma.business.findUnique({
          where: { id: core.id },
        });

        if (!business) {
          // Try by name if ID doesn't match
          business = await prisma.business.findFirst({
            where: { name: core.name },
          });
        }

        if (business) {
          // Update Business with image
          await prisma.business.update({
            where: { id: business.id },
            data: {
              logoUrl: core.primaryImagePath,
            },
          });
          businessUpdated++;

          // Update BusinessPage with image
          const page = await prisma.businessPage.findUnique({
            where: { businessId: business.id },
          });

          if (page) {
            await prisma.businessPage.update({
              where: { id: page.id },
              data: {
                heroImageUrl: core.primaryImagePath,
              },
            });
            pageUpdated++;
            console.log(`✅ ${business.name}: ${core.primaryImagePath}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing ${core.name}:`, err);
      }
    }

    console.log(`\n📈 Sync complete:`);
    console.log(`  ✅ Business records updated: ${businessUpdated}`);
    console.log(`  ✅ BusinessPage records updated: ${pageUpdated}`);
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
