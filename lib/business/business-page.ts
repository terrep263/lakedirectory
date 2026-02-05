import { prisma } from '@/lib/prisma';
import { generateBusinessDescription } from './ai-description';

/**
 * Create a slug from business name for URL-safe business page route
 */
function createSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensure a unique slug by appending a suffix if needed
 */
async function ensureUniqueSlug(baseSlug: string, businessId: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.businessPage.findUnique({
      where: { slug },
    });
    
    if (!existing) {
      return slug;
    }
    
    // If the existing page is for the same business, reuse the slug
    if (existing.businessId === businessId) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export interface CreateBusinessPageInput {
  businessId: string;
  businessName: string;
  businessCategory?: string;
  businessCity?: string;
  businessState?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessRating?: number;
  businessRatingCount?: number;
  heroImageUrl?: string;
  locationText?: string;
}

/**
 * Create or update a BusinessPage for an imported business.
 * - Creates the page if it doesn't exist
 * - Generates AI description if empty
 * - Auto-publishes with publishedAt timestamp
 * - Returns the created or updated page
 */
export async function ensureBusinessPageExists(
  input: CreateBusinessPageInput
): Promise<any> {
  // Create base slug
  const baseSlug = createSlugFromName(input.businessName);
  const slug = await ensureUniqueSlug(baseSlug, input.businessId);

  // Check if page exists
  const existing = await prisma.businessPage.findUnique({
    where: { businessId: input.businessId },
  });

  if (existing) {
    // Page exists - generate description if missing
    if (!existing.aiDescription && process.env.OPENAI_API_KEY) {
      try {
        const description = await generateBusinessDescription({
          name: input.businessName,
          category: input.businessCategory,
          city: input.businessCity,
          state: input.businessState,
          phone: input.businessPhone,
          website: input.businessWebsite,
          aggregateRating: input.businessRating,
          totalRatings: input.businessRatingCount,
        });

        return prisma.businessPage.update({
          where: { id: existing.id },
          data: {
            aiDescription: description,
            isPublished: true,
            publishedAt: new Date(),
          },
        });
      } catch (err) {
        console.error('[business-page] Failed to generate description:', err);
        // Continue without description
      }
    }

    // Ensure it's published
    if (!existing.isPublished) {
      return prisma.businessPage.update({
        where: { id: existing.id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }

    return existing;
  }

  // Create new page
  let aiDescription: string | null = null;

  if (process.env.OPENAI_API_KEY) {
    try {
      aiDescription = await generateBusinessDescription({
        name: input.businessName,
        category: input.businessCategory,
        city: input.businessCity,
        state: input.businessState,
        phone: input.businessPhone,
        website: input.businessWebsite,
        aggregateRating: input.businessRating,
        totalRatings: input.businessRatingCount,
      });
    } catch (err) {
      console.error('[business-page] Failed to generate description:', err);
      // Continue with null description
    }
  }

  return prisma.businessPage.create({
    data: {
      businessId: input.businessId,
      slug,
      title: input.businessName,
      heroImageUrl: input.heroImageUrl,
      locationText: input.locationText,
      aiDescription,
      isPublished: true,
      publishedAt: new Date(),
    },
  });
}
