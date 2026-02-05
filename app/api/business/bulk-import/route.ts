import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/identity';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BusinessImportData {
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  website?: string;
}

interface BulkImportRequestBody {
  businesses: BusinessImportData[];
  countyId: string;
  generateDescriptions?: boolean;
}

/**
 * Bulk Business Import Endpoint
 * 
 * POST /api/business/bulk-import
 * Imports multiple businesses with AI descriptions
 */
export async function POST(request: NextRequest) {
  try {
    // GUARD: Admin only
    const adminResult = await requireAdmin(request);
    if (!adminResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: adminResult.status || 403 }
      );
    }

    const body: BulkImportRequestBody = await request.json();
    const { businesses, countyId, generateDescriptions = true } = body;

    // Validate required fields
    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json(
        { error: 'Businesses array is required' },
        { status: 400 }
      );
    }

    if (!countyId) {
      return NextResponse.json(
        { error: 'countyId is required' },
        { status: 400 }
      );
    }

    const results = {
      total: businesses.length,
      created: 0,
      skipped: 0,
      failed: 0,
      businesses: [] as any[],
    };

    // Process each business
    for (const businessData of businesses) {
      try {
        // Skip if missing required fields
        if (!businessData.name) {
          results.failed++;
          results.businesses.push({
            name: businessData.name || 'Unknown',
            status: 'failed',
            error: 'Missing business name',
          });
          continue;
        }

        // Generate slug
        const slug = businessData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Check if business already exists
        const existingBusiness = await prisma.business.findFirst({
          where: {
            OR: [
              { name: businessData.name, countyId },
              { slug, countyId },
            ],
          },
        });

        if (existingBusiness) {
          results.skipped++;
          results.businesses.push({
            name: businessData.name,
            status: 'skipped',
            reason: 'Already exists',
            existingId: existingBusiness.id,
          });
          continue;
        }

        // Create business
        const newBusiness = await prisma.business.create({
          data: {
            name: businessData.name,
            slug: slug,
            category: businessData.category || null,
            address: businessData.address || null,
            city: businessData.city || null,
            state: businessData.state || 'FL',
            zipCode: businessData.zipCode || null,
            phone: businessData.phone || null,
            website: businessData.website || null,
            countyId: countyId,
            isVerified: false,
            ownerId: null,
          },
        });

        let description = null;

        // Generate AI description if enabled
        if (generateDescriptions && process.env.OPENAI_API_KEY) {
          try {
            description = await generateBusinessDescription({
              ...businessData,
              countyId,
            });

            await prisma.business.update({
              where: { id: newBusiness.id },
              data: { description },
            });
          } catch (descError) {
            console.error(`Failed to generate description for ${businessData.name}:`, descError);
            // Continue even if description generation fails
          }
        }

        results.created++;
        results.businesses.push({
          name: businessData.name,
          status: 'created',
          businessId: newBusiness.id,
          slug: newBusiness.slug,
          url: `/business/${newBusiness.slug}`,
          hasDescription: !!description,
        });

      } catch (businessError) {
        console.error(`Error processing business ${businessData.name}:`, businessError);
        results.failed++;
        results.businesses.push({
          name: businessData.name,
          status: 'failed',
          error: businessError instanceof Error ? businessError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk import completed: ${results.created} created, ${results.skipped} skipped, ${results.failed} failed`,
      results,
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}

/**
 * Generate AI-powered business description using OpenAI
 */
async function generateBusinessDescription(businessData: BusinessImportData & { countyId: string }): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Generate a creative, engaging description for a business in the ${businessData.category || 'local business'} category. The business is located in ${businessData.city ? `${businessData.city}, ${businessData.state || 'Florida'}` : 'Lake County, Florida'} and its name is "${businessData.name}". The description should be suitable for a business listing page and be 2-3 sentences long.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 150,
  });

  const description = completion.choices[0]?.message?.content?.trim();
  
  if (!description) {
    throw new Error('Failed to generate description');
  }

  return description;
}
