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
  countyId: string;
  // Additional fields as needed
}

interface ImportRequestBody {
  businessData: BusinessImportData;
  generateDescription?: boolean;
}

/**
 * Business Import Endpoint
 * 
 * POST /api/business/import
 * Imports a business and optionally generates an AI description
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

    const body: ImportRequestBody = await request.json();
    const { businessData, generateDescription = true } = body;

    // Validate required fields
    if (!businessData.name || !businessData.countyId) {
      return NextResponse.json(
        { error: 'Business name and countyId are required' },
        { status: 400 }
      );
    }

    // Generate slug from business name
    const slug = businessData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if business with same name already exists in this county
    const existingBusiness = await prisma.business.findFirst({
      where: {
        name: businessData.name,
        countyId: businessData.countyId,
      },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: 'Business with this name already exists in this county' },
        { status: 409 }
      );
    }

    // Create business in database (initially without description)
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
        countyId: businessData.countyId,
        isVerified: false,
        ownerId: null, // Unclaimed initially
      },
    });

    const businessId = newBusiness.id;
    let description = null;

    // Generate AI description if requested and OpenAI is configured
    if (generateDescription && process.env.OPENAI_API_KEY) {
      try {
        description = await generateBusinessDescription(businessData);
        
        // Update business with generated description
        await prisma.business.update({
          where: { id: businessId },
          data: { description },
        });
      } catch (descError) {
        console.error('Error generating business description:', descError);
        // Continue even if description generation fails
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Business imported successfully',
      businessId,
      slug,
      description,
      url: `/business/${slug}`,
    });

  } catch (error) {
    console.error('Error importing business:', error);
    return NextResponse.json(
      { error: 'Failed to import business' },
      { status: 500 }
    );
  }
}

/**
 * Generate AI-powered business description using OpenAI
 */
async function generateBusinessDescription(businessData: BusinessImportData): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Build prompt with available business information
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
