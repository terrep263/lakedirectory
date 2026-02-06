/**
 * Blog Post Detail Page - Using Authoritative Layout from lcl.zip
 *
 * Layout primitives:
 * - max-w-4xl article container
 * - Featured image with 16:9 aspect ratio
 * - Category badge, title, meta info
 * - Content section with proper typography
 * - Related business section
 * - Back to blog link
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { getPexelsCuratedPhotos, pickPexelsPhotoUrl } from '@/lib/pexels';

// Blog categories based on ZIP reference
const categories = [
  { id: 'local_news', name: 'Local News' },
  { id: 'business_spotlight', name: 'Business Spotlight' },
  { id: 'events', name: 'Events' },
  { id: 'food_dining', name: 'Food & Dining' },
  { id: 'community', name: 'Community' },
];

// Placeholder posts for demonstration
const placeholderPosts = [
  {
    id: '1',
    title: 'Discover the Best Local Restaurants in Lake County',
    slug: 'best-local-restaurants-lake-county',
    excerpt:
      'From family-owned diners to upscale dining experiences, Lake County has something for every palate. Explore our top picks for local cuisine.',
    content: `
Lake County, Florida is home to an incredible variety of dining options that showcase the best of local flavors and culinary traditions. Whether you're craving comfort food, fresh seafood, or international cuisine, our local restaurants deliver quality and community connection with every meal.

## Why Eat Local?

Supporting local restaurants means supporting your neighbors. When you dine at a locally-owned establishment, you're investing in the community. Local restaurants create jobs, contribute to the local economy, and often source ingredients from nearby farms and suppliers.

## Our Top Picks

### Family-Style Dining
Lake County's family restaurants offer hearty portions and welcoming atmospheres. Many have been serving the community for generations, passing down recipes and hospitality from one family member to the next.

### Fresh Seafood
Despite being inland, Lake County benefits from proximity to both coasts. Several restaurants specialize in bringing fresh catches to your table, prepared with care and local flair.

### International Flavors
Our diverse community is reflected in the variety of international cuisines available. From authentic Mexican taquerias to cozy Italian trattorias, you can explore the world without leaving Lake County.

## Supporting Small Business

Every meal at a local restaurant helps keep our community vibrant. The next time you're deciding where to eat, consider choosing local. Your taste buds and your neighbors will thank you.
    `,
    category: 'food_dining',
    authorName: 'Lake County Local',
    featuredImageUrl: null,
    publishedAt: new Date('2024-01-15'),
    tags: ['restaurants', 'dining', 'local food', 'Lake County'],
  },
  {
    id: '2',
    title: 'Supporting Small Businesses: Why Shopping Local Matters',
    slug: 'supporting-small-businesses',
    excerpt:
      "Learn how your purchasing decisions impact the local economy and why choosing local businesses creates a stronger community.",
    content: `
When you shop at a local business, you're doing more than making a purchase. You're investing in your community's future, supporting your neighbors, and helping create the kind of town you want to live in.

## The Local Economic Impact

Studies show that for every $100 spent at a local business, approximately $68 stays in the local economy. Compare that to national chains, where only about $43 remains local. This money circulates through the community, supporting other businesses and creating jobs.

## Building Community Connections

Local business owners aren't just vendors—they're neighbors. They know your name, remember your preferences, and genuinely care about your satisfaction. This personal connection creates a shopping experience that no algorithm can replicate.

## Unique Products and Services

Local businesses often offer unique products and services that reflect the character of our community. From handcrafted goods to specialized services, these offerings add to what makes Lake County special.

## How You Can Help

1. **Choose Local First**: Before buying online or at a chain, check if a local business offers what you need
2. **Spread the Word**: Leave reviews, tell friends, and share your positive experiences on social media
3. **Be Patient**: Small businesses may have different hours or inventory—your flexibility helps them survive
4. **Build Relationships**: Get to know your local business owners and their stories

## The Ripple Effect

Every purchase at a local business creates ripples throughout the community. You're helping fund Little League teams, supporting local charities, and keeping our downtown vibrant. That's the power of shopping local.
    `,
    category: 'community',
    authorName: 'Lake County Local',
    featuredImageUrl: null,
    publishedAt: new Date('2024-01-10'),
    tags: ['small business', 'local economy', 'community', 'shopping local'],
  },
  {
    id: '3',
    title: 'Upcoming Events in Lake County This Month',
    slug: 'upcoming-events-lake-county',
    excerpt:
      "Mark your calendars! Here are the can't-miss events happening across Lake County's 15 cities this month.",
    content: `
Lake County is always buzzing with community events, festivals, and gatherings. Here's your guide to what's happening across our 15 cities this month.

## Weekly Farmers Markets

### Leesburg Farmers Market
Every Saturday from 9 AM to 1 PM at Towne Square. Fresh produce, local crafts, and live music make this a beloved community tradition.

### Mount Dora Market
Sundays on Donnelly Street feature an eclectic mix of antiques, art, and artisan goods alongside farm-fresh offerings.

## Special Events

### Community Celebrations
Keep an eye on your local city calendar for parades, concerts in the park, and holiday celebrations. Each of Lake County's cities hosts unique events throughout the year.

### Business Grand Openings
New businesses are always opening their doors in Lake County. Watch our directory for announcements and special opening-day deals.

## How to Stay Updated

The best way to stay informed about local events is to:
- Follow your city's official social media accounts
- Sign up for local business newsletters
- Check community bulletin boards at local shops
- Browse the Lake County Local directory for business-hosted events

## Support Through Attendance

Attending local events supports our community in many ways. You're supporting the businesses and organizations that make these events possible, connecting with neighbors, and helping create the vibrant community we all enjoy.
    `,
    category: 'events',
    authorName: 'Lake County Local',
    featuredImageUrl: null,
    publishedAt: new Date('2024-01-05'),
    tags: ['events', 'Lake County', 'community events', 'farmers market'],
  },
];

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = placeholderPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const categoryName = categories.find((c) => c.id === post.category)?.name || post.category.replace('_', ' ');

  // Fetch Pexels photos for featured image
  const pexelsPhotos = await getPexelsCuratedPhotos(20, 3600);
  const postIndex = placeholderPosts.findIndex((p) => p.slug === slug);
  const pexelsImageUrl = pickPexelsPhotoUrl(pexelsPhotos, postIndex);
  const featuredImageUrl = post.featuredImageUrl || pexelsImageUrl;

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      {/* Main Content */}
      <main>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <article>
          {/* Featured Image */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              width: '100%',
              height: '384px',
              marginBottom: '32px',
            }}
          >
            {featuredImageUrl ? (
              <img
                src={featuredImageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg className="w-24 h-24 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Header */}
          <header style={{ marginBottom: '32px' }}>
            {/* Category Badge */}
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '9999px',
                }}
              >
                {categoryName}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '16px',
                lineHeight: '1.2',
              }}
            >
              {post.title}
            </h1>

            {/* Meta */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: '#6b7280',
                fontSize: '14px',
                gap: '16px',
              }}
            >
              <span>By {post.authorName}</span>
              <span>•</span>
              <time dateTime={post.publishedAt?.toISOString()}>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Draft'}
              </time>
            </div>

            {/* Excerpt */}
            <p style={{ fontSize: '18px', color: '#6b7280', marginTop: '16px', lineHeight: '1.6' }}>{post.excerpt}</p>
          </header>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none"
            style={{
              color: '#374151',
              fontSize: '16px',
              lineHeight: '1.8',
            }}
          >
            {post.content.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('## ')) {
                return (
                  <h2
                    key={index}
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#111827',
                      marginTop: '32px',
                      marginBottom: '16px',
                    }}
                  >
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              if (paragraph.startsWith('### ')) {
                return (
                  <h3
                    key={index}
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#111827',
                      marginTop: '24px',
                      marginBottom: '12px',
                    }}
                  >
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.trim().startsWith('1. ') || paragraph.trim().startsWith('- ')) {
                const items = paragraph.split('\n').filter((line) => line.trim());
                return (
                  <ul key={index} style={{ marginLeft: '24px', marginBottom: '16px' }}>
                    {items.map((item, i) => (
                      <li key={i} style={{ marginBottom: '8px' }}>
                        {item.replace(/^[\d]+\.\s*\*\*/, '').replace(/\*\*:/, ':').replace(/^\-\s*/, '')}
                      </li>
                    ))}
                  </ul>
                );
              }
              if (paragraph.trim()) {
                return (
                  <p key={index} style={{ marginBottom: '16px' }}>
                    {paragraph.trim()}
                  </p>
                );
              }
              return null;
            })}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div
              style={{
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>Tagged:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      color: '#374151',
                      fontSize: '14px',
                      borderRadius: '9999px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div
            style={{
              marginTop: '48px',
              padding: '24px',
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
              Support Local Businesses
            </h3>
            <p style={{ color: '#166534', marginBottom: '16px' }}>
              Discover amazing local businesses in Lake County and help strengthen our community.
            </p>
            <Link
              href="/businesses"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#0d9488',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: '500',
                textDecoration: 'none',
              }}
            >
              Browse Local Businesses
            </Link>
          </div>

          {/* Back to Blog */}
          <div style={{ marginTop: '48px' }}>
            <Link
              href="/blog"
              className="hover:text-teal-700"
              style={{
                color: '#0d9488',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to all posts
            </Link>
          </div>
        </article>
        </div>

        <PublicFooter countyName="Lake County" state="Florida" />
      </main>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = placeholderPosts.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title} | Lake County Local Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}
