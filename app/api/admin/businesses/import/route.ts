import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/identity';
import { LAKE_COUNTY_CITIES, DEAL_CATEGORIES } from '@/lib/business';
import OpenAI from 'openai';
import { fetchWithTimeout } from '@/lib/http/fetch';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate slug from business name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * Generate unique slug by appending suffix if needed
 */
async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = generateSlug(baseName);

  // Check if slug exists
  const existing = await prisma.businessPage.findUnique({
    where: { slug: baseSlug },
  });

  if (!existing) {
    return baseSlug;
  }

  // Append random suffix
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}

/**
 * Generate AI-powered business description using OpenAI
 */
async function generateBusinessDescription(
  name: string,
  category: string,
  city: string
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured, skipping description generation');
    return null;
  }

  try {
    const prompt = `Write a brief, engaging 2-3 sentence description for a local business listing.
Business name: "${name}"
Category: ${category || 'local business'}
Location: ${city || 'Lake County'}, Florida

The description should:
- Be welcoming and professional
- Highlight what makes local businesses valuable to the community
- NOT make specific claims about services, hours, or pricing that might be inaccurate
- Be suitable for a directory listing page`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error generating business description:', error);
    return null;
  }
}

/**
 * Parse address from Google Places format
 */
function parseAddress(address?: string): {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string
} {
  if (!address) {
    return {
      streetAddress: '',
      city: '',
      state: 'FL',
      postalCode: '',
    };
  }

  const parts = address.split(',').map((p) => p.trim());
  const streetAddress = parts[0] ?? '';
  const city = parts[1] ?? '';
  const statePostal = parts[2]?.split(' ').filter(Boolean) ?? [];
  const state = statePostal[0] ?? 'FL';
  const postalCode = statePostal[1] ?? '';

  return { streetAddress, city, state, postalCode };
}

/**
 * Store Google photo locally with the actual business ID
 */
async function storeGooglePhoto(
  apiKey: string,
  photoReference: string,
  businessId: string
): Promise<string | null> {
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 20000 });

    if (!res.ok) {
      console.warn(`Photo fetch failed: ${res.status}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const imageDir = path.join(process.cwd(), 'public', 'business-assets');
    await fs.mkdir(imageDir, { recursive: true });

    const filename = `${businessId}.jpg`;
    const filePath = path.join(imageDir, filename);
    await fs.writeFile(filePath, buffer);

    console.log(`[GOOGLE_IMPORT] Stored photo: /business-assets/${filename}`);
    return `/business-assets/${filename}`;
  } catch (err) {
    console.warn('Photo download failed:', err);
    return null;
  }
}

/**
 * Fetch place details from Google Places Details API
 */
interface PlaceDetailsResponse {
  result?: {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_phone_number?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    url?: string;
    website?: string;
    photos?: Array<{
      photo_reference: string;
    }>;
    editorial_summary?: {
      overview?: string;
    };
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name?: string;
      rating?: number;
      text?: string;
      relative_time_description?: string;
    }>;
    business_status?: string;
  };
  status?: string;
}

function modelHasField(modelName: string, fieldName: string): boolean {
  try {
    const models = (prisma as any)?._dmmf?.datamodel?.models;
    const model = Array.isArray(models) ? models.find((m: any) => m?.name === modelName) : null;
    const fields = model?.fields;
    return Array.isArray(fields) ? fields.some((f: any) => f?.name === fieldName) : false;
  } catch {
    return false;
  }
}

async function resolveGooglePhotoUrl(
  apiKey: string,
  photoReference: string
): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
    const res = await fetchWithTimeout(url, { redirect: 'manual', timeoutMs: 15000 });

    const location = res.headers.get('location');
    if (location) return location;
    if (res.ok) return res.url || url;
    return null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<PlaceDetailsResponse | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('key', apiKey);
  url.searchParams.set(
    'fields',
    'place_id,name,business_status,formatted_address,address_components,formatted_phone_number,geometry,url,website,photos,editorial_summary,opening_hours,rating,user_ratings_total,reviews'
  );

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url.toString(), { timeoutMs: 15000 });

      if (!response.ok) {
        console.error(`[GOOGLE_IMPORT] Details API HTTP error for ${placeId}: ${response.status}`);
        if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
          await sleep(300 * Math.pow(3, attempt - 1));
          continue;
        }
        return null;
      }

      const data: PlaceDetailsResponse = await response.json();

      if (data.status !== 'OK') {
        console.error(`[GOOGLE_IMPORT] Details API error for ${placeId}: ${data.status}`);
        if (data.status === 'UNKNOWN_ERROR' && attempt < maxAttempts) {
          await sleep(300 * Math.pow(3, attempt - 1));
          continue;
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error(`[GOOGLE_IMPORT] Failed to fetch details for ${placeId} (attempt ${attempt}):`, error);
      if (attempt < maxAttempts) {
        await sleep(300 * Math.pow(3, attempt - 1));
        continue;
      }
      return null;
    }
  }

  return null;
}

/**
 * POST /api/admin/businesses/import
 *
 * Imports businesses from Google Places, creates Business + BusinessPage records atomically,
 * generates AI descriptions, and auto-publishes pages.
 */
export async function POST(request: NextRequest) {
  try {
    // Enforce admin access
    const adminResult = await requireAdmin(request);
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
    }

    const body = await request.json();
    const { city, categoryId, pageToken } = body;

    // Validate city
    if (!city || !LAKE_COUNTY_CITIES.includes(city)) {
      return NextResponse.json(
        { error: 'Invalid or missing city. Must be one of: ' + LAKE_COUNTY_CITIES.join(', ') },
        { status: 400 }
      );
    }

    // Validate category
    if (!categoryId || !DEAL_CATEGORIES.find((c) => c.name === categoryId)) {
      return NextResponse.json(
        { error: 'Invalid or missing category. Must be one of: ' + DEAL_CATEGORIES.map((c) => c.name).join(', ') },
        { status: 400 }
      );
    }

    // Get category search terms
    const category = DEAL_CATEGORIES.find((c) => c.name === categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    const searchTerm = category.searchTerms[0];
    const query = `${searchTerm} in ${city}, FL`;

    // Call Google Places Text Search API
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', query);
    url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY || '');
    url.searchParams.set('language', 'en');
    url.searchParams.set('region', 'us');
    if (pageToken) {
      url.searchParams.set('pagetoken', pageToken);
    }

    const placesResponse = await fetch(url.toString());
    if (!placesResponse.ok) {
      return NextResponse.json(
        { error: 'Google Places API error: ' + placesResponse.statusText },
        { status: 502 }
      );
    }

    const placesData = (await placesResponse.json()) as any;

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: 'Google Places API error: ' + placesData.status },
        { status: 502 }
      );
    }

    const places = placesData.results || [];
    const nextPageToken = placesData.next_page_token || null;

    console.log(`[GOOGLE_IMPORT] Text Search returned ${places.length} results for query: ${query}`);
    console.log('[GOOGLE_IMPORT] DETAILS FIELDS ENABLED: phone,address,geo,photos,ratings,reviews');

    // Import results tracking
    let importedCount = 0;
    let skippedCount = 0;
    const importedBusinesses: Array<{ businessId: string; pageId: string; slug: string }> = [];

    // Process each place
    for (const place of places) {
      try {
        const placeId = place.place_id;
        console.log(`[GOOGLE_IMPORT] Processing place: ${place.name} (ID: ${placeId})`);

        // Skip if no place_id
        if (!placeId) {
          console.log(`[GOOGLE_IMPORT] Skipping ${place.name}: no place_id`);
          skippedCount++;
          continue;
        }

        // Check if business already exists by external place ID
        let existingBusiness = await prisma.business.findUnique({
          where: { externalPlaceId: placeId },
          include: { businessPage: true },
        });

        // If not found by place ID, try finding by name + city (for legacy imports)
        if (!existingBusiness) {
          existingBusiness = await prisma.business.findFirst({
            where: {
              name: { equals: place.name, mode: 'insensitive' },
              city: { equals: city, mode: 'insensitive' },
            },
            include: { businessPage: true },
          });
        }

        if (existingBusiness) {
          // Business exists - update with Details API data and ensure BusinessPage exists
          console.log(`[GOOGLE_IMPORT] Found existing business: ${existingBusiness.id}`);
          
          // FETCH FULL DETAILS FROM GOOGLE PLACES DETAILS API
          console.log(`[GOOGLE_IMPORT] Fetching Details API for place_id: ${placeId}`);
          const detailsResponse = await fetchPlaceDetails(
            process.env.GOOGLE_PLACES_API_KEY || '',
            placeId
          );

          if (!detailsResponse || !detailsResponse.result) {
            console.error(`[GOOGLE_IMPORT] Details API failed for place_id ${placeId} - skipping place`);
            skippedCount++;
            continue;
          }

          const details = detailsResponse.result;

          if (details) {
            console.log(`[GOOGLE_IMPORT] Details API returned:`, {
              phone: details.formatted_phone_number,
              address: details.formatted_address,
              hasEditorialSummary: !!details.editorial_summary?.overview,
            });

            // Build update object - only update missing fields
            const updates: Record<string, any> = {
              externalPlaceId: placeId, // Always update place ID
              ingestionSource: 'GOOGLE_PLACES',
              lastSyncedAt: new Date(),
            };

            // Only add fields if they're currently empty
            if (!existingBusiness.phone) {
              updates.phone = details.formatted_phone_number || null;
              console.log(`[GOOGLE_IMPORT] Adding phone: ${updates.phone}`);
            }
            if (modelHasField('Business', 'formattedAddress') && !existingBusiness.formattedAddress) {
              updates.formattedAddress = details.formatted_address || null;
              console.log(`[GOOGLE_IMPORT] Adding address: ${updates.formattedAddress}`);
            }
            if (modelHasField('Business', 'address') && !(existingBusiness as any).address) {
              updates.address = details.formatted_address || null;
            }
            if (!existingBusiness.description && details.editorial_summary?.overview) {
              updates.description = details.editorial_summary.overview;
              console.log(`[GOOGLE_IMPORT] Adding description`);
            }
            if (!existingBusiness.latitude && details.geometry?.location?.lat) {
              updates.latitude = details.geometry.location.lat;
              updates.longitude = details.geometry.location.lng;
              console.log(`[GOOGLE_IMPORT] Adding coordinates: ${updates.latitude}, ${updates.longitude}`);
            }
            if (modelHasField('Business', 'mapUrl') && !(existingBusiness as any).mapUrl && details.url) {
              updates.mapUrl = details.url;
            }
            if (modelHasField('Business', 'website') && !(existingBusiness as any).website && details.website) {
              updates.website = details.website;
            }
            
            // Download and store photo if missing
            if (!existingBusiness.coverUrl && details.photos?.[0]?.photo_reference && process.env.GOOGLE_PLACES_API_KEY) {
              const storedPhotoUrl = await storeGooglePhoto(
                process.env.GOOGLE_PLACES_API_KEY,
                details.photos[0].photo_reference,
                existingBusiness.id
              );
              if (storedPhotoUrl) {
                updates.coverUrl = storedPhotoUrl;
                console.log(`[GOOGLE_IMPORT] Downloaded and stored photo: ${storedPhotoUrl}`);
              }
            }
            
            if (modelHasField('Business', 'logoUrl') && !(existingBusiness as any).logoUrl && details.photos?.[0]?.photo_reference && process.env.GOOGLE_PLACES_API_KEY) {
              const resolved = await resolveGooglePhotoUrl(
                process.env.GOOGLE_PLACES_API_KEY,
                details.photos[0].photo_reference
              );
              if (resolved) updates.logoUrl = resolved;
            }
            if (modelHasField('Business', 'rating') && !(existingBusiness as any).rating && typeof details.rating === 'number') {
              updates.rating = details.rating;
            }
            if (modelHasField('Business', 'reviewCount') && !(existingBusiness as any).reviewCount && typeof details.user_ratings_total === 'number') {
              updates.reviewCount = details.user_ratings_total;
            }
            if (modelHasField('Business', 'aggregateRating') && !existingBusiness.aggregateRating && typeof details.rating === 'number') {
              updates.aggregateRating = details.rating;
            }
            if (modelHasField('Business', 'totalRatings') && !existingBusiness.totalRatings && typeof details.user_ratings_total === 'number') {
              updates.totalRatings = details.user_ratings_total;
            }

            if (modelHasField('Business', 'reviews') && !(existingBusiness as any).reviews && Array.isArray(details.reviews) && details.reviews.length > 0) {
              updates.reviews = details.reviews.slice(0, 3).map((r) => ({
                author_name: r.author_name,
                rating: r.rating,
                text: r.text,
                relative_time_description: r.relative_time_description,
              }));
            }

            // Update business
            await prisma.business.update({
              where: { id: existingBusiness.id },
              data: updates,
            });

            console.log(`[GOOGLE_IMPORT] Updated existing business ${existingBusiness.id} with Details API data`);
          }

          // Update or create BusinessPage with enriched data from Details API
          const refreshedBusiness = await prisma.business.findUnique({
            where: { id: existingBusiness.id },
            include: { businessPage: true },
          });

          if (!refreshedBusiness) {
            skippedCount++;
            continue;
          }

          // Prepare location text
          const refreshedLocationText = refreshedBusiness.city
            ? `${refreshedBusiness.city}, ${refreshedBusiness.state || 'FL'}`
            : `${city}, FL`;

          if (!refreshedBusiness.businessPage) {
            // Create missing BusinessPage with all enriched data
            const slug = await generateUniqueSlug(refreshedBusiness.name);
            const aiDescription =
              details.editorial_summary?.overview ||
              (await generateBusinessDescription(
                refreshedBusiness.name,
                refreshedBusiness.category || categoryId,
                refreshedBusiness.city || city
              ));

            const page = await prisma.businessPage.create({
              data: {
                businessId: refreshedBusiness.id,
                slug,
                title: refreshedBusiness.name,
                heroImageUrl: refreshedBusiness.coverUrl || refreshedBusiness.logoUrl,
                locationText: refreshedLocationText,
                aiDescription,
                isPublished: true,
                publishedAt: new Date(),
              },
            });

            importedBusinesses.push({
              businessId: refreshedBusiness.id,
              pageId: page.id,
              slug: page.slug,
            });
            importedCount++;
            console.log(`[GOOGLE_IMPORT] Created BusinessPage for existing business ${refreshedBusiness.id}`);
          } else {
            // Update existing BusinessPage with refreshed data from Details API
            const pageUpdates: Record<string, any> = {
              title: refreshedBusiness.name,
              locationText: refreshedLocationText,
              updatedAt: new Date(),
            };

            // Update image if we have a new one and current is missing
            if (!refreshedBusiness.businessPage.heroImageUrl && refreshedBusiness.coverUrl) {
              pageUpdates.heroImageUrl = refreshedBusiness.coverUrl;
            }

            // Update description if Google provided one and current doesn't have one
            if (!refreshedBusiness.businessPage.aiDescription && details.editorial_summary?.overview) {
              pageUpdates.aiDescription = details.editorial_summary.overview;
            }

            await prisma.businessPage.update({
              where: { id: refreshedBusiness.businessPage.id },
              data: pageUpdates,
            });

            importedCount++;
            console.log(`[GOOGLE_IMPORT] Updated BusinessPage for existing business ${refreshedBusiness.id}`);
          }
          continue;
        }

        // FETCH FULL DETAILS FROM GOOGLE PLACES DETAILS API
        const detailsResponse = await fetchPlaceDetails(
          process.env.GOOGLE_PLACES_API_KEY || '',
          placeId
        );

        if (!detailsResponse || !detailsResponse.result) {
          console.error(`[GOOGLE_IMPORT] Skipping ${placeId} - Details API failed`);
          skippedCount++;
          continue;
        }

        const details = detailsResponse.result;
        if (!details.name) {
          console.error(`[GOOGLE_IMPORT] Skipping ${placeId} - Details API missing name`);
          skippedCount++;
          continue;
        }

        // Parse address from Details API response
        const addressParts = parseAddress(details.formatted_address);
        const locationText = addressParts.city
          ? `${addressParts.city}, ${addressParts.state}`
          : `${city}, FL`;

        // Generate unique slug
        const slug = await generateUniqueSlug(details.name);

        // Pre-generate business ID for consistent photo naming
        const { randomUUID } = await import('crypto');
        const businessId = randomUUID();

        // Download photo from Details API response using actual business ID
        let heroImageUrl: string | null = null;
        const photoRef = details.photos?.[0]?.photo_reference;
        if (photoRef && process.env.GOOGLE_PLACES_API_KEY) {
          heroImageUrl = await storeGooglePhoto(
            process.env.GOOGLE_PLACES_API_KEY,
            photoRef,
            businessId
          );
        }

        // Resolve logo URL from first photo_reference (does not store API key)
        let logoUrl: string | null = null;
        if (photoRef && process.env.GOOGLE_PLACES_API_KEY) {
          logoUrl = await resolveGooglePhotoUrl(process.env.GOOGLE_PLACES_API_KEY, photoRef);
        }

        // Generate AI description (prefer Google's editorial summary if available)
        let aiDescription: string | null = null;
        if (details.editorial_summary?.overview) {
          aiDescription = details.editorial_summary.overview;
        } else {
          aiDescription = await generateBusinessDescription(
            details.name,
            categoryId,
            addressParts.city || city
          );
        }

        // Create Business + BusinessPage atomically
        const result = await prisma.$transaction(async (tx) => {
          // A) Create Business record using DETAILS API data with pre-generated ID
          const businessData: Record<string, any> = {
            id: businessId,  // Use pre-generated ID that matches photo filename
            name: details.name,
            slug: slug,
            category: categoryId,
            addressLine1: addressParts.streetAddress || null,
            city: addressParts.city || city,
            state: addressParts.state || 'FL',
            postalCode: addressParts.postalCode || null,
            latitude: details.geometry?.location?.lat || null,
            longitude: details.geometry?.location?.lng || null,
            formattedAddress: details.formatted_address || null,
            phone: details.formatted_phone_number || null,
            externalPlaceId: placeId,
            ingestionSource: 'GOOGLE_PLACES',
            aggregateRating: typeof details.rating === 'number' ? details.rating : null,
            totalRatings: typeof details.user_ratings_total === 'number' ? details.user_ratings_total : null,
            operationalStatus: details.business_status || 'OPERATIONAL',
            coverUrl: heroImageUrl,
            businessStatus: 'ACTIVE',
            lastSyncedAt: new Date(),
          };

          // Persist additional fields ONLY if schema supports them.
          if (modelHasField('Business', 'address')) {
            businessData.address = details.formatted_address || null;
          }
          if (modelHasField('Business', 'mapUrl')) {
            businessData.mapUrl = details.url || null;
          }
          if (modelHasField('Business', 'website')) {
            businessData.website = details.website || null;
          }
          if (modelHasField('Business', 'description')) {
            businessData.description = details.editorial_summary?.overview || null;
          }
          if (modelHasField('Business', 'logoUrl')) {
            businessData.logoUrl = logoUrl;
          }
          if (modelHasField('Business', 'rating')) {
            businessData.rating = typeof details.rating === 'number' ? details.rating : null;
          }
          if (modelHasField('Business', 'reviewCount')) {
            businessData.reviewCount = typeof details.user_ratings_total === 'number' ? details.user_ratings_total : null;
          }
          if (modelHasField('Business', 'reviews') && Array.isArray(details.reviews) && details.reviews.length > 0) {
            businessData.reviews = details.reviews.slice(0, 3).map((r) => ({
              author_name: r.author_name,
              rating: r.rating,
              text: r.text,
              relative_time_description: r.relative_time_description,
            }));
          }

          const business = await tx.business.create({
            // businessData is built dynamically with schema guards (modelHasField).
            // Cast for Prisma type compatibility in strict builds.
            data: businessData as any,
          });

          // B) Create BusinessPage record (auto-published)
          const page = await tx.businessPage.create({
            data: {
              businessId: business.id,
              slug: slug,
              title: details.name || business.name,
              heroImageUrl: heroImageUrl,
              locationText: locationText,
              aiDescription: aiDescription,
              isPublished: true,
              publishedAt: new Date(),
              isFeatured: false,
            },
          });

          console.log('[GOOGLE_IMPORT] Created new business with photo:', { 
            businessId: business.id,
            heroImageUrl,
            coverUrl: business.coverUrl
          });

          return { business, page };
        });

        // Photo already has correct filename (businessId.jpg), no rename needed

        importedBusinesses.push({
          businessId: result.business.id,
          pageId: result.page.id,
          slug: result.page.slug,
        });
        importedCount++;

      } catch (placeError) {
        console.error('Error importing place:', placeError);
        skippedCount++;
      }
    }

    // Log import batch
    const batchId = `batch-${Date.now()}`;
    await prisma.businessImportLog.create({
      data: {
        importBatchId: batchId,
        source: 'GOOGLE',
        location: { type: 'SingleCity', city, category: categoryId },
        category: categoryId,
        radiusMeters: 0,
        createdCount: importedCount,
        skippedCount: skippedCount,
        completedAt: !nextPageToken ? new Date() : null,
        params: {
          query,
          pageToken: pageToken || null,
          hasNextPage: !!nextPageToken,
        },
      },
    });

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      nextPageToken,
      businesses: importedBusinesses,
    });

  } catch (error) {
    console.error('Google Places import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
