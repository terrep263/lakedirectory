import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Searching for images across all tables...\n');

    // Check BusinessCore table (original import data)
    const businessCoreWithImages = await prisma.businessCore.findMany({
      where: {
        primaryImagePath: {
          not: 'placeholder.png',
        },
      },
      select: {
        id: true,
        name: true,
        primaryImagePath: true,
      },
      take: 5,
    });

    console.log(`BusinessCore records with images: ${businessCoreWithImages.length}`);
    if (businessCoreWithImages.length > 0) {
      console.log('\nSample images from BusinessCore:');
      businessCoreWithImages.forEach((b) => {
        console.log(`  - ${b.name}: ${b.primaryImagePath}`);
      });
    }

    // Check Business table
    const businessWithImages = await prisma.business.findMany({
      where: {
        OR: [
          { logoUrl: { not: null } },
          { coverUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        coverUrl: true,
      },
      take: 5,
    });

    console.log(`\nBusiness records with images: ${businessWithImages.length}`);
    if (businessWithImages.length > 0) {
      console.log('\nSample images from Business:');
      businessWithImages.forEach((b) => {
        console.log(`  - ${b.name}:`);
        if (b.logoUrl) console.log(`    logoUrl: ${b.logoUrl}`);
        if (b.coverUrl) console.log(`    coverUrl: ${b.coverUrl}`);
      });
    }

    // Get total counts
    const totalBusinessCore = await prisma.businessCore.count({
      where: {
        primaryImagePath: { not: 'placeholder.png' },
      },
    });
    
    console.log(`\n📊 Total BusinessCore with images: ${totalBusinessCore}`);
    
    // Check if we need to sync images from BusinessCore to Business to BusinessPage
    if (totalBusinessCore > 0) {
      console.log('\n💡 Images are in BusinessCore.primaryImagePath');
      console.log('Need to sync: BusinessCore → Business → BusinessPage');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
