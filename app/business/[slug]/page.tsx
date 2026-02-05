/**
 * Business Detail Page - Using Authoritative Layout from lcl.zip
 *
 * Layout primitives:
 * - Container: max-w-7xl (1280px)
 * - Cover image: aspect-[21/9]
 * - Contact grid: md:grid-cols-2 gap-6
 * - Breadcrumbs with chevron separators
 */

import { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BusinessShareButtons from '@/components/BusinessShareButtons';
import AdminQuickNav from '@/components/layout/AdminQuickNav';
import RecommendButton from '@/components/RecommendButton';
import { validateBusinessPageShareability, validateBusinessShareability, getShareabilityErrorMessage } from '@/lib/business/share-validation';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const hdrs = await headers();
  const getHeader = (name: string) => {
    return typeof (hdrs as any)?.get === 'function' ? (hdrs as any).get(name) : undefined;
  };

  const forwardedProto = getHeader('x-forwarded-proto') || 'https';
  const forwardedHost = getHeader('x-forwarded-host') || getHeader('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${forwardedProto}://${forwardedHost}`;

  // Try to find BusinessPage first (authoritative source for display)
  const page = await prisma.businessPage.findFirst({
    where: {
      OR: [{ slug }, { businessId: slug }],
      isPublished: true,
    },
    select: {
      title: true,
      slug: true,
      aiDescription: true,
      locationText: true,
      heroImageUrl: true,
      business: {
        select: {
          category: true,
          logoUrl: true,
        },
      },
    },
  });

  if (page) {
    const businessUrl = `${baseUrl}/business/${page.slug}`;
    const description = page.aiDescription || `${page.title} - ${page.business.category || 'Business'} in ${page.locationText || 'Lake County, Florida'}`;
    
    // Use heroImageUrl (1200x630 minimum) or fallback to logoUrl
    // Ensure absolute URL for social sharing
    const imageUrl = page.heroImageUrl || page.business.logoUrl;
    const absoluteImageUrl = imageUrl?.startsWith('http') 
      ? imageUrl 
      : imageUrl 
        ? `${baseUrl}${imageUrl}` 
        : null;

    return {
      title: `${page.title} | Lake County Local`,
      description,
      metadataBase: new URL(baseUrl),
      alternates: { canonical: businessUrl },
      // Open Graph metadata - business-specific, never site-wide defaults
      openGraph: {
        // Use standard OG type supported by Next.js metadata API
        type: 'website',
        url: businessUrl,
        title: page.title,
        description,
        siteName: 'Lake County Local',
        images: absoluteImageUrl ? [
          {
            url: absoluteImageUrl,
            width: 1200,
            height: 630,
            alt: page.title,
          }
        ] : [],
        locale: 'en_US',
      },
      // Twitter Card metadata - business-specific
      twitter: {
        card: 'summary_large_image',
        title: page.title,
        description,
        images: absoluteImageUrl ? [absoluteImageUrl] : [],
      },
    };
  }

  // Fallback to Business table for legacy data
  const business = await prisma.business.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      city: true,
      logoUrl: true,
      coverUrl: true,
    },
  });

  if (!business) {
    return {
      title: 'Business Not Found',
    };
  }

    const businessUrl = `${baseUrl}/business/${business.slug || business.id}`;
  const description = business.description || `${business.name} - ${business.category || 'Business'} in ${business.city || 'Lake County'}, Florida`;
  const imageUrl = business.coverUrl || business.logoUrl;
    const absoluteImageUrl = imageUrl?.startsWith('http') 
      ? imageUrl 
      : imageUrl 
        ? `${baseUrl}${imageUrl}` 
        : null;

  return {
    title: `${business.name} | Lake County Local`,
    description,
      metadataBase: new URL(baseUrl),
      alternates: { canonical: businessUrl },
    openGraph: {
      // Use standard OG type supported by Next.js metadata API
      type: 'website',
      url: businessUrl,
      title: business.name,
      description,
      siteName: 'Lake County Local',
      images: absoluteImageUrl ? [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: business.name,
        }
      ] : [],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: business.name,
      description,
      images: absoluteImageUrl ? [absoluteImageUrl] : [],
    },
  };
}

export default async function BusinessProfilePage({ params }: PageProps) {
  const { slug } = await params;

  // Try to find BusinessPage first (authoritative source for display)
  const page = await prisma.businessPage.findFirst({
    where: {
      OR: [{ slug }, { businessId: slug }],
      isPublished: true,
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          address: true,
          addressLine1: true,
          city: true,
          state: true,
          zipCode: true,
          postalCode: true,
          phone: true,
          website: true,
          latitude: true,
          longitude: true,
          logoUrl: true,
          coverUrl: true,
          photos: true,
          hours: true,
          isVerified: true,
          ownerId: true,
          countyId: true,
          recommendationCount: true,
          createdAt: true,
          formattedAddress: true,
          deals: {
            where: {
              dealStatus: 'ACTIVE',
            },
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      },
    },
  });

  // If BusinessPage found, use it
  if (page) {
    const business = page.business;
    const isClaimed = business.ownerId !== null;
    const isFeatured = page.isFeatured;

    // Validate shareability
    const shareValidation = validateBusinessPageShareability({
      title: page.title,
      aiDescription: page.aiDescription,
      heroImageUrl: page.heroImageUrl,
    });

    // Use page data for display, business data for details
    const displayData = {
      id: business.id,
      name: page.title,
      slug: page.slug,
      description: page.aiDescription || business.description,
      category: business.category,
      address: business.formattedAddress || business.addressLine1 || business.address,
      city: business.city,
      state: business.state,
      zipCode: business.postalCode || business.zipCode,
      phone: business.phone,
      website: business.website,
      latitude: business.latitude,
      longitude: business.longitude,
      logoUrl: business.logoUrl,
      coverUrl: page.heroImageUrl || business.coverUrl,
      photos: business.photos,
      hours: business.hours,
      isVerified: business.isVerified,
      ownerId: business.ownerId,
      countyId: business.countyId,
      recommendationCount: business.recommendationCount,
      createdAt: business.createdAt,
      deals: business.deals,
      isFeatured,
      locationText: page.locationText,
      shareValidation,
    };

    return renderBusinessPage(displayData, isClaimed);
  }

  // Fallback to Business table for legacy data without BusinessPage
  const business = await prisma.business.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      website: true,
      latitude: true,
      longitude: true,
      logoUrl: true,
      coverUrl: true,
      photos: true,
      hours: true,
      isVerified: true,
      ownerId: true,
      countyId: true,
      recommendationCount: true,
      createdAt: true,
      deals: {
        where: {
          dealStatus: 'ACTIVE',
        },
        select: {
          id: true,
          title: true,
          description: true,
        },
      },
    },
  });

  if (!business) {
    notFound();
  }

  const isClaimed = business.ownerId !== null;
  
  // Validate shareability for legacy business
  const shareValidation = validateBusinessShareability({
    name: business.name,
    description: business.description,
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl,
  });

  const displayData = {
    ...business,
    isFeatured: false,
    locationText: business.city ? `${business.city}, ${business.state || 'FL'}` : null,
    shareValidation,
  };

  return renderBusinessPage(displayData, isClaimed);
}

interface DisplayData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  coverUrl: string | null;
  photos: string[];
  hours: any;
  isVerified: boolean;
  ownerId: string | null;
  countyId: string | null;
  recommendationCount: number;
  createdAt: Date;
  deals: Array<{ id: string; title: string; description: string | null }>;
  isFeatured: boolean;
  locationText: string | null;
  shareValidation: {
    isShareable: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

function renderBusinessPage(business: DisplayData, isClaimed: boolean) {

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />
      <main>

      {/* Breadcrumbs - Exact ZIP Structure */}
      <div className="bg-white border-b border-gray-200">
        <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', padding: '12px 16px' }}>
          <div className="text-sm flex items-center gap-2" style={{ color: '#6b7280' }}>
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {business.city && (
              <>
                <Link href={`/businesses?city=${business.city}`} className="hover:text-gray-900 transition-colors">
                  {business.city}
                </Link>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            {business.category && (
              <Link
                href={`/businesses?category=${business.category}${business.city ? `&city=${business.city}` : ''}`}
                className="hover:text-gray-900 transition-colors"
              >
                {business.category}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content - Exact ZIP Structure */}
      <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Card */}
          <div
            className="bg-white overflow-hidden"
            style={{ border: '1px solid #e5e7eb', borderRadius: '6px' }}
          >
            {/* Cover Image - Exact ZIP aspect-[21/9] */}
            <div
              className="relative"
              style={{ aspectRatio: '21/9', background: '#f3f4f6' }}
            >
              {business.coverUrl ? (
                <img
                  src={business.coverUrl}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  <span style={{ fontSize: '96px', fontWeight: 'bold', color: 'white' }}>
                    {business.name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Badges - Exact ZIP top-right placement */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                {business.isFeatured && (
                  <div
                    className="text-white font-medium flex items-center gap-1.5 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '6px 12px', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Featured
                  </div>
                )}
                {business.isVerified && (
                  <div
                    className="text-white font-medium flex items-center gap-1.5 shadow-lg"
                    style={{ background: '#2563eb', padding: '6px 12px', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </div>
                )}
                {!isClaimed && (
                  <div
                    className="text-white font-medium flex items-center gap-1.5 shadow-lg"
                    style={{ background: '#f59e0b', padding: '6px 12px', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Unclaimed
                  </div>
                )}
              </div>
            </div>

            {/* Business Info - Exact ZIP p-8 padding */}
            <div style={{ padding: '32px' }}>
              <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                {business.name}
              </h1>
              <div className="flex items-center gap-3 mb-6" style={{ color: '#4b5563' }}>
                {business.category && (
                  <Link
                    href={`/businesses?category=${business.category}`}
                    className="hover:text-blue-700 transition-colors font-medium"
                    style={{ color: '#2563eb' }}
                  >
                    {business.category}
                  </Link>
                )}
                {business.category && business.city && (
                  <span style={{ color: '#d1d5db' }}>•</span>
                )}
                {business.city && (
                  <Link
                    href={`/businesses?city=${business.city}`}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {business.city}, {business.state || 'FL'}
                  </Link>
                )}
              </div>

              {/* Description */}
              {business.description && (
                <div className="prose max-w-none">
                  <p style={{ color: '#374151', lineHeight: '1.75' }}>{business.description}</p>
                </div>
              )}

              {/* Recommend Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Recommend to Others
                </h3>
                <RecommendButton 
                  businessId={business.id} 
                  businessName={business.name}
                  initialCount={business.recommendationCount}
                />
              </div>

              {/* Share Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Share This Business
                </h3>
                {business.shareValidation.isShareable ? (
                  <BusinessShareButtons
                    businessName={business.name}
                    businessId={business.id}
                    countyId={business.countyId || ''}
                    showLabels={true}
                  />
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800 mb-1">
                          Sharing Not Available
                        </p>
                        <p className="text-sm text-amber-700">
                          {getShareabilityErrorMessage(business.shareValidation)}
                        </p>
                        {business.shareValidation.warnings.length > 0 && (
                          <ul className="mt-2 text-xs text-amber-600 list-disc list-inside">
                            {business.shareValidation.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Grid - Exact ZIP md:grid-cols-2 gap-6 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Details */}
            <div
              className="bg-white"
              style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '24px' }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                Contact Information
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {business.address && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Address</p>
                      <p style={{ color: '#111827' }}>{business.address}</p>
                    </div>
                  </div>
                )}

                {(() => {
                  const hasCoords =
                    typeof business.latitude === 'number' &&
                    typeof business.longitude === 'number' &&
                    Number.isFinite(business.latitude) &&
                    Number.isFinite(business.longitude);

                  const mapSrc = hasCoords
                    ? `https://www.google.com/maps?q=${business.latitude},${business.longitude}&z=15&output=embed`
                    : business.address
                      ? `https://www.google.com/maps?q=${encodeURIComponent(business.address)}&z=15&output=embed`
                      : null;

                  if (!mapSrc) return null;

                  return (
                    <div className="overflow-hidden" style={{ borderRadius: '6px' }}>
                      <iframe
                        title="Map showing business location"
                        src={mapSrc}
                        className="w-full pointer-events-none"
                        style={{ height: '340px', border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    </div>
                  );
                })()}

                {business.phone && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Phone</p>
                      <a href={`tel:${business.phone}`} className="hover:text-blue-700 transition-colors font-medium" style={{ color: '#2563eb' }}>
                        {business.phone}
                      </a>
                    </div>
                  </div>
                )}

                {business.website && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Website</p>
                      <a
                        href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-700 transition-colors font-medium break-all"
                        style={{ color: '#2563eb' }}
                      >
                        {business.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </div>
                  </div>
                )}

                {!business.address && !business.phone && !business.website && (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>No contact information available</p>
                )}
              </div>
            </div>

            {/* Business Hours */}
            <div
              className="bg-white"
              style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '24px' }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                Business Hours
              </h2>
              {business.hours && typeof business.hours === 'object' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#374151', fontSize: '14px', lineHeight: '1.75' }}>
                  {Object.entries(business.hours as Record<string, string>).map(([day, time]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize" style={{ fontWeight: '500' }}>{day}</span>
                      <span>{time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Hours not available</p>
              )}
            </div>
          </div>

          {/* Active Deals */}
          {business.deals.length > 0 && (
            <div
              className="bg-white"
              style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '24px' }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                Active Deals
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {business.deals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(to right, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.1))',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}
                  >
                    <p style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{deal.title}</p>
                    {deal.description && (
                      <p style={{ fontSize: '14px', color: '#4b5563' }}>{deal.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim This Business CTA - Exact ZIP Structure */}
          {!isClaimed && (
            <div
              style={{
                background: 'linear-gradient(to right, #fef3c7, #ffedd5)',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '24px'
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div
                    className="flex items-center justify-center"
                    style={{ width: '48px', height: '48px', background: '#f59e0b', borderRadius: '999px' }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Are you the owner of {business.name}?
                  </h3>
                  <p style={{ color: '#4b5563', marginBottom: '16px' }}>
                    Claim this listing to manage your business information, respond to reviews, and unlock premium features.
                  </p>
                  <Link
                    href={`/business/${business.slug || business.id}/claim`}
                    className="inline-flex items-center gap-2 hover:opacity-90 transition-all font-medium shadow-md hover:shadow-lg"
                    style={{
                      padding: '12px 24px',
                      background: '#f59e0b',
                      color: 'white',
                      borderRadius: '8px'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Claim This Business
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Back Links - Exact ZIP Structure */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/businesses"
              className="inline-flex items-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium"
              style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Directory
            </Link>

            {business.city && (
              <Link
                href={`/businesses?city=${business.city}`}
                className="inline-flex items-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium"
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                View more in {business.city}
              </Link>
            )}

            {business.category && (
              <Link
                href={`/businesses?category=${business.category}`}
                className="inline-flex items-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium"
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                View more {business.category}
              </Link>
            )}
          </div>
        </div>
      </div>

      <PublicFooter countyName="Lake County" state="Florida" />
      </main>

      {/* Admin Quick Access */}
      <AdminQuickNav />
    </div>
  );
}
