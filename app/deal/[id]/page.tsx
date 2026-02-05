/**
 * Deal Detail Page Template
 * 
 * This template is ready for when deals are generated.
 * ShareButtons are already integrated for social sharing.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ShareButtons from '@/components/ShareButtons';
import AdminQuickNav from '@/components/layout/AdminQuickNav';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { DealStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Avoid DB calls during Vercel build ("Collecting page data").
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      title: 'Deal | Lake County Local',
      description: 'Discover local deals in Lake County.',
    };
  }

  const { id } = await params;

  try {
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        business: {
          select: {
            name: true,
            city: true,
          },
        },
      },
    });

    if (!deal) {
      return {
        title: 'Deal Not Found',
      };
    }

    return {
      title: `${deal.title} | ${deal.business.name} | Lake County Local`,
      description: deal.description || `${deal.title} at ${deal.business.name}`,
    };
  } catch {
    return {
      title: 'Deal | Lake County Local',
      description: 'Discover local deals in Lake County.',
    };
  }
}

export default async function DealPage({ params }: PageProps) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return (
      <div className="min-h-screen bg-[#f6f8fb]">
        <PublicHeader />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Deal</h1>
            <p className="mt-2 text-slate-600">This page loads at runtime in production.</p>
          </div>
        </main>
        <PublicFooter countyName="Lake County" state="Florida" />
      </div>
    );
  }

  const { id } = await params;

  try {
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        dealCategory: true,
        originalValue: true,
        dealPrice: true,
        redemptionWindowEnd: true,
        dealStatus: true,
        createdAt: true,
        countyId: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            city: true,
            state: true,
            address: true,
            phone: true,
            website: true,
            logoUrl: true,
            coverUrl: true,
          },
        },
      },
    });

    if (!deal || deal.dealStatus !== DealStatus.ACTIVE) {
      notFound();
    }

    const dealUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://lakecountylocal.com'}/deal/${deal.id}`;
    const businessUrl = `/business/${deal.business.slug || deal.business.id}`;

    return (
      <div className="min-h-screen bg-[#f6f8fb]">
        <PublicHeader />

        <main>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-sm flex items-center gap-2 text-slate-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/businesses" className="hover:text-gray-900 transition-colors">Businesses</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href={businessUrl} className="hover:text-gray-900 transition-colors">
              {deal.business.name}
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900">Deals</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Deal Card */}
          <div className="bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            {/* Deal Header with Business Cover */}
            <div className="relative" style={{ aspectRatio: '21/9', background: '#f3f4f6' }}>
              {deal.business.coverUrl ? (
                <img
                  src={deal.business.coverUrl}
                  alt={deal.business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <div className="text-center text-white">
                    <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <p className="text-2xl font-bold">Exclusive Deal</p>
                  </div>
                </div>
              )}

              {/* Deal Badge */}
              <div className="absolute top-4 right-4">
                <div
                  className="text-white font-bold flex items-center gap-2 shadow-lg"
                  style={{ background: '#10b981', padding: '12px 20px', borderRadius: '8px', fontSize: '16px' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  DEAL
                </div>
              </div>
            </div>

            {/* Deal Content */}
            <div style={{ padding: '32px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                {deal.title}
              </h1>

              {deal.description && (
                <div className="prose max-w-none mb-6">
                  <p style={{ color: '#374151', lineHeight: '1.75', fontSize: '16px' }}>{deal.description}</p>
                </div>
              )}

              {/* Deal Details */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {deal.dealCategory && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac'
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: '500', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Category
                    </p>
                    <p style={{ fontWeight: '600', color: '#166534', fontSize: '16px' }}>{deal.dealCategory}</p>
                  </div>
                )}

                {deal.dealPrice && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac'
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: '500', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Deal Price
                    </p>
                    <p style={{ fontWeight: '600', color: '#166534', fontSize: '16px' }}>
                      ${Number(deal.dealPrice).toFixed(2)}
                    </p>
                  </div>
                )}

                {deal.redemptionWindowEnd && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: '#fef3c7',
                      border: '1px solid #fbbf24'
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: '500', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Expires
                    </p>
                    <p style={{ fontWeight: '600', color: '#78350f', fontSize: '16px' }}>
                      {new Date(deal.redemptionWindowEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Share Buttons */}
              <div className="pt-6 border-t border-gray-200">
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Share This Deal & Earn Rewards
                </h3>
                <ShareButtons
                  businessUrl={dealUrl}
                  businessName={`${deal.title} at ${deal.business.name}`}
                  businessId={deal.business.id}
                  dealId={deal.id}
                  countyId={deal.countyId ?? ''}
                  showLabels={true}
                />
              </div>
            </div>
          </div>

          {/* Business Info Card */}
          <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
              About {deal.business.name}
            </h2>

            <div className="flex items-start gap-4 mb-6">
              {deal.business.logoUrl && (
                <img
                  src={deal.business.logoUrl}
                  alt={deal.business.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                  {deal.business.name}
                </h3>
                {deal.business.category && (
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                    {deal.business.category}
                  </p>
                )}
                {deal.business.city && (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    {deal.business.city}, {deal.business.state || 'FL'}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deal.business.address && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p style={{ color: '#111827' }}>{deal.business.address}</p>
                </div>
              )}

              {deal.business.phone && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${deal.business.phone}`} className="hover:text-blue-700 transition-colors" style={{ color: '#2563eb' }}>
                    {deal.business.phone}
                  </a>
                </div>
              )}

              {deal.business.website && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <a
                    href={deal.business.website.startsWith('http') ? deal.business.website : `https://${deal.business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-700 transition-colors break-all"
                    style={{ color: '#2563eb' }}
                  >
                    {deal.business.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link
                href={businessUrl}
                className="inline-flex items-center gap-2 hover:opacity-90 transition-all font-medium"
                style={{
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '8px'
                }}
              >
                View Business Profile
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Back Link */}
          <div>
            <Link
              href={businessUrl}
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
              Back to {deal.business.name}
            </Link>
          </div>
        </div>
      </div>

          <PublicFooter countyName="Lake County" state="Florida" />

        </main>

        {/* Admin Quick Access */}
        <AdminQuickNav />
      </div>
    );
  } catch {
    return (
      <div className="min-h-screen bg-[#f6f8fb]">
        <PublicHeader />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">This page is temporarily unavailable</h1>
            <p className="mt-2 text-slate-600">Please try again in a moment.</p>
            <div className="mt-6">
              <Link href="/businesses" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                Back to businesses →
              </Link>
            </div>
          </div>
        </main>
        <PublicFooter countyName="Lake County" state="Florida" />
      </div>
    );
  }
}
