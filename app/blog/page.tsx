/**
 * Blog Listing Page - Using Authoritative Layout from lcl.zip
 *
 * Layout primitives:
 * - max-w-[1100px] container
 * - Header with category filters
 * - 3-column blog post grid backed by the CMS
 */

import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { getBlogPosts } from '@/app/actions/blog-actions';

// Blog categories based on ZIP reference
const categories = [
  { id: 'local_news', name: 'Local News' },
  { id: 'business_spotlight', name: 'Business Spotlight' },
  { id: 'events', name: 'Events' },
  { id: 'food_dining', name: 'Food & Dining' },
  { id: 'community', name: 'Community' },
];

interface BlogListingPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function BlogListingPage({ searchParams }: BlogListingPageProps) {
  const params = await searchParams;
  const category = params.category;

  // Filter posts by category if selected
  const allPosts = await getBlogPosts();
  const filteredPosts = category
    ? allPosts.filter((post) => post.category === category)
    : allPosts;

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      <main>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Lake County Local Blog
          </h1>
          <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
            Stories, tips, and updates from Lake County, Florida
          </p>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
          <Link
            href="/blog"
            className="transition-colors"
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: '500',
              background: !category ? '#0d9488' : '#e5e7eb',
              color: !category ? '#ffffff' : '#374151',
              textDecoration: 'none',
            }}
          >
            All Posts
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog?category=${cat.id}`}
              className="transition-colors hover:bg-gray-300"
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                background: category === cat.id ? '#0d9488' : '#e5e7eb',
                color: category === cat.id ? '#ffffff' : '#374151',
                textDecoration: 'none',
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Blog Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => {
              const categoryName =
                categories.find((c) => c.id === post.category)?.name || post.category.replace('_', ' ');

              return (
                <Link key={post.id} href={`/blog/${post.slug}`} className="block group">
                  <article
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    style={{ height: '100%' }}
                  >
                    {/* Featured Image */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        height: '192px',
                      }}
                    >
                      {post.featuredImageUrl ? (
                        <img
                          src={post.featuredImageUrl}
                          alt={post.featuredImageAlt || post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                          <svg
                            className="w-16 h-16 text-white/50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
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

                    {/* Content */}
                    <div style={{ padding: '24px' }}>
                      {/* Category Badge */}
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '12px',
                          fontWeight: '500',
                          borderRadius: '9999px',
                          marginBottom: '12px',
                        }}
                      >
                        {categoryName}
                      </span>

                      {/* Title */}
                      <h2
                        className="group-hover:text-teal-600 transition-colors"
                        style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#111827',
                          marginBottom: '8px',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          marginBottom: '16px',
                          lineHeight: '1.6',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {post.excerpt}
                      </p>

                      {/* Published Date */}
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Draft'}
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        </div>
        <PublicFooter countyName="Lake County" state="Florida" />
      </main>
    </div>
  );
}
