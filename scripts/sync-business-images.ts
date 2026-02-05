import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Syncing images from Business to BusinessPage...\n');

    // Get featured pages to check images
    const featuredPages = await prisma.businessPage.findMany({
      where: { isFeatured: true },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            coverUrl: true,
            photos: true,
          },
        },
      },
    });

    console.log(`Found ${featuredPages.length} featured pages\n`);

    for (const page of featuredPages) {
      console.log(`${page.title}:`);
      console.log(`  Current heroImageUrl: ${page.heroImageUrl || 'NONE'}`);
      console.log(`  Business logoUrl: ${page.business.logoUrl || 'NONE'}`);
      console.log(`  Business coverUrl: ${page.business.coverUrl || 'NONE'}`);
      console.log(`  Business photos: ${page.business.photos.length} photos`);
      
      // Determine best image to use
      let imageUrl = page.heroImageUrl;
      
      if (!imageUrl) {
        // Try coverUrl first, then logoUrl, then first photo
        imageUrl = page.business.coverUrl || 
                   page.business.logoUrl || 
                   (page.business.photos.length > 0 ? page.business.photos[0] : null);
        
        if (imageUrl) {
          await prisma.businessPage.update({
            where: { id: page.id },
            data: { heroImageUrl: imageUrl },
          });
          console.log(`  ✅ Updated with: ${imageUrl}`);
        } else {
          console.log(`  ⚠️  No image available`);
        }
      }
      console.log('');
    }

    // Now update ALL pages, not just featured
    console.log('\n🔄 Updating all BusinessPages with images...\n');
    
    const allPages = await prisma.businessPage.findMany({
      where: {
        OR: [
          { heroImageUrl: null },
          { heroImageUrl: '' },
        ],
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            coverUrl: true,
            photos: true,
          },
        },
      },
      take: 20, // Limit to first 20 to avoid long output
    });

    let updated = 0;
    for (const page of allPages) {
      const imageUrl = page.business.coverUrl || 
                       page.business.logoUrl || 
                       (page.business.photos.length > 0 ? page.business.photos[0] : null);
      
      if (imageUrl) {
        await prisma.businessPage.update({
          where: { id: page.id },
          data: { heroImageUrl: imageUrl },
        });
        updated++;
      }
    }

    console.log(`✅ Updated ${updated} pages with images`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
