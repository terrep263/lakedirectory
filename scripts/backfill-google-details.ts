import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PlaceDetailsResponse {
  result?: {
    formatted_address?: string;
    formatted_phone_number?: string;
    editorial_summary?: {
      overview?: string;
    };
    photos?: Array<{
      photo_reference: string;
    }>;
  };
  status?: string;
}

/**
 * Fetch place details from Google Places Details API
 */
async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<PlaceDetailsResponse | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('fields', 'place_id,name,formatted_address,address_components,formatted_phone_number,geometry,photos,editorial_summary,business_status,website');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`[BACKFILL] HTTP error for ${placeId}: ${response.status}`);
      return null;
    }

    const data: PlaceDetailsResponse = await response.json();

    if (data.status !== 'OK') {
      console.error(`[BACKFILL] API error for ${placeId}: ${data.status}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`[BACKFILL] Failed to fetch details for ${placeId}:`, error);
    return null;
  }
}

/**
 * Build a Google Maps photo URL for display
 */
function buildPhotoUrl(apiKey: string, photoReference: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
  url.searchParams.set('maxwidth', '800');
  url.searchParams.set('photoreference', photoReference);
  url.searchParams.set('key', apiKey);
  return url.toString();
}

/**
 * Main backfill execution
 */
async function backfillGoogleDetails() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error('[BACKFILL] GOOGLE_PLACES_API_KEY not configured');
    process.exit(1);
  }

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // Find all eligible businesses from known Google import cities
    // These 51 businesses were imported from Google Places but lack proper source tracking
    const googleImportCities = ['Groveland', 'Mascotte', 'Leesburg'];

    const eligibleBusinesses = await prisma.business.findMany({
      where: {
        city: {
          in: googleImportCities,
        },
        OR: [
          { phone: null },
          { phone: '' },
          { address: null },
          { address: '' },
          { formattedAddress: null },
          { formattedAddress: '' },
          { description: null },
          { description: '' },
          { logoUrl: null },
          { logoUrl: '' },
        ],
      },
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        address: true,
        formattedAddress: true,
        description: true,
        logoUrl: true,
      },
    });

    console.log(`[BACKFILL] Found ${eligibleBusinesses.length} eligible businesses in ${googleImportCities.join(', ')} to process`);

    // Process each business sequentially
    for (const business of eligibleBusinesses) {
      totalScanned++;

      // Since these businesses don't have externalPlaceId, we'll need to search Google Places
      // For now, log what's missing so user can decide next step
      console.log(`[BACKFILL] ${business.id} (${business.name}): Missing fields - phone:${!business.phone}, address:${!business.address}, description:${!business.description}, logo:${!business.logoUrl}`);
      totalSkipped++;
    }

    // Print summary
    console.log('\n[BACKFILL] ========== SUMMARY ==========');
    console.log(`[BACKFILL] Total scanned: ${totalScanned}`);
    console.log(`[BACKFILL] Total updated: ${totalUpdated}`);
    console.log(`[BACKFILL] Total skipped: ${totalSkipped}`);
    console.log(`[BACKFILL] Total errors: ${totalErrors}`);
    console.log('[BACKFILL] ==============================\n');
    console.log('[BACKFILL] NOTE: These businesses lack externalPlaceId.');
    console.log('[BACKFILL] To backfill with Google data, we need to either:');
    console.log('[BACKFILL] 1. Re-import these businesses using the new Details API import');
    console.log('[BACKFILL] 2. Manually add externalPlaceId to each business');
    console.log('[BACKFILL] 3. Search Google Places by name to find their place_id\n');

    process.exit(0);
  } catch (error) {
    console.error('[BACKFILL] Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
backfillGoogleDetails();
