/**
 * Backfill BusinessPages for existing Business records
 * Creates a BusinessPage for each Business that doesn't have one
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateBusinessDescription(businessInfo: {
  name: string;
  category?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  aggregateRating?: number;
  totalRatings?: number;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `${businessInfo.name} - ${businessInfo.category || 'Local Business'}`;
  }

  try {
    let details = `Business Name: ${businessInfo.name}`;
    if (businessInfo.category) details += `\nCategory: ${businessInfo.category}`;
    if (businessInfo.city || businessInfo.state) {
      const location = [businessInfo.city, businessInfo.state].filter(Boolean).join(', ');
      details += `\nLocation: ${location}`;
    }
    if (businessInfo.phone) details += `\nPhone: ${businessInfo.phone}`;
    if (businessInfo.website) details += `\nWebsite: ${businessInfo.website}`;
    if (businessInfo.aggregateRating) details += `\nRating: ${businessInfo.aggregateRating}`;
    if (businessInfo.totalRatings) details += `\nTotal Ratings: ${businessInfo.totalRatings}`;

    const prompt = `Generate a brief, engaging business description (2-3 sentences) for a Lake County Local business listing. Include what makes this business special and why locals should visit. Be friendly and welcoming.\n\n${details}\n\nDescription:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    return content?.trim() || `${businessInfo.name} - ${businessInfo.category || 'Local Business'}`;
  } catch (err) {
    console.warn('OpenAI generation failed, using fallback');
    return `${businessInfo.name} - ${businessInfo.category || 'Local Business'}`;
  }
}

function createSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureUniqueSlug(baseSlug: string, businessId: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.businessPage.findUnique({
      where: { slug },
    });

    if (!existing) return slug;
    if (existing.businessId === businessId) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function ensureBusinessPageExists(input: {
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
}): Promise<any> {
  const baseSlug = createSlugFromName(input.businessName);
  const slug = await ensureUniqueSlug(baseSlug, input.businessId);

  const existing = await prisma.businessPage.findUnique({
    where: { businessId: input.businessId },
  });

  if (existing) {
    if (!existing.aiDescription) {
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
        data: { aiDescription: description },
      });
    }
    return existing;
  }

  const aiDescription = await generateBusinessDescription({
    name: input.businessName,
    category: input.businessCategory,
    city: input.businessCity,
    state: input.businessState,
    phone: input.businessPhone,
    website: input.businessWebsite,
    aggregateRating: input.businessRating,
    totalRatings: input.businessRatingCount,
  });

  return prisma.businessPage.create({
    data: {
      businessId: input.businessId,
      slug,
      title: input.businessName,
      heroImageUrl: input.heroImageUrl ?? null,
      locationText: input.locationText ?? null,
      aiDescription,
      isPublished: true,
      publishedAt: new Date(),
    },
  });
}

async function main() {
  try {
    console.log('🔄 Starting backfill of BusinessPages for existing businesses...\n');

    // Find all businesses without pages
    const businessesWithoutPages = await prisma.business.findMany({
      where: {
        businessPage: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📊 Found ${businessesWithoutPages.length} businesses without BusinessPages\n`);

    if (businessesWithoutPages.length === 0) {
      console.log('✅ All businesses already have pages!');
      return;
    }

    let created = 0;
    let errors = 0;

    for (const business of businessesWithoutPages) {
      try {
        console.log(`Processing: ${business.name}...`);

        await ensureBusinessPageExists({
          businessId: business.id,
          businessName: business.name,
          businessCategory: business.category ?? undefined,
          businessCity: business.city ?? undefined,
          businessState: business.state ?? undefined,
          businessPhone: business.phone ?? undefined,
          businessWebsite: business.website ?? undefined,
          businessRating: business.aggregateRating ?? undefined,
          businessRatingCount: business.totalRatings ?? undefined,
          heroImageUrl: business.logoUrl ?? undefined,
          locationText: business.city && business.state 
            ? `${business.city}, ${business.state}` 
            : undefined,
        });

        console.log(`  ✅ Created BusinessPage for ${business.name}`);
        created++;
      } catch (err) {
        console.error(
          `  ❌ Error creating page for ${business.name}:`,
          err instanceof Error ? err.message : err
        );
        errors++;
      }
    }

    console.log(`\n📈 Backfill complete:`);
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ❌ Errors: ${errors}`);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
