import Link from 'next/link'
import AdminQuickNav from '@/components/layout/AdminQuickNav'
import FeaturedBusinessesDisplay from '@/components/FeaturedBusinessesDisplay'
import HomeSearch from '@/components/home/HomeSearch'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { getPexelsCuratedPhotos, pickPexelsPhotoUrl } from '@/lib/pexels'
import { getFeaturedBlogPosts } from '@/app/actions/blog-actions'
import DealCard from '@/components/deals/DealCard'
import { prisma } from '@/lib/prisma'

export const revalidate = 3600 // refresh images hourly

export default async function HomePage() {
  const countyName = 'Lake County'
  const state = 'Florida'

  // Kept as human-readable values to match existing `/businesses?city=...&category=...` filters.
  const cities = [
    'Astatula',
    'Astor',
    'Clermont',
    'Eustis',
    'Fruitland Park',
    'Groveland',
    'Howey-in-the-Hills',
    'Lady Lake',
    'Leesburg',
    'Mascotte',
    'Minneola',
    'Montverde',
    'Mount Dora',
    'Tavares',
    'Umatilla',
  ]

  const categories = [
    'Food & Dining',
    'Home Services',
    'Health & Wellness',
    'Beauty & Personal Care',
    'Automotive',
    'Shopping & Retail',
    'Professional Services',
    'Entertainment & Activities',
    'Travel & Lodging',
    'Education & Training',
    'Pets & Animals',
    'Real Estate & Housing',
  ]

  const testimonials = [
    {
      quote:
        'We found a great local electrician in minutes. The directory is clean, fast, and actually useful.',
      name: 'Sarah M.',
      city: 'Clermont',
    },
    {
      quote:
        'As a small business owner, being discoverable here has brought real customers through the door.',
      name: 'James R.',
      city: 'Leesburg',
    },
    {
      quote:
        'The featured listings feel curated, not spammy. It’s my first stop when I need something local.',
      name: 'Anita P.',
      city: 'Mount Dora',
    },
  ]

  // Get blog posts (optional - table may not exist)
  let blogPosts: any[] = []
  try {
    blogPosts = await getFeaturedBlogPosts(3)
  } catch (error) {
    console.log('Blog posts not available (table may not exist)')
    blogPosts = []
  }

  // Get featured deals (optional - graceful failure)
  let featuredDeals: any[] = []
  try {
    featuredDeals = await prisma.deal.findMany({
      where: {
        dealStatus: 'ACTIVE',
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            logoUrl: true,
            coverUrl: true,
            category: true,
            founderStatus: {
              select: {
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            vouchers: {
              where: { voucherStatus: 'ISSUED' },
            },
          },
        },
      },
      orderBy: [
        { business: { founderStatus: { isActive: 'desc' } } },
        { createdAt: 'desc' },
      ],
      take: 4,
    })
  } catch (error) {
    console.log('Featured deals not available:', error)
    featuredDeals = []
  }

  const pexels = await getPexelsCuratedPhotos(60, 3600)
  const heroPhoto = 'https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/header.jpg'
  const featuredFallbackImages = Array.from({ length: 8 })
    .map((_, i) => pickPexelsPhotoUrl(pexels, 30 + i))
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('${heroPhoto}')`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-white/90 text-sm font-semibold">
              Free Business Listings • Premium Deal Features Available
            </p>
            <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Lake County&apos;s Local Business Directory & Deals Marketplace
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl">
              Find trusted local businesses and exclusive voucher deals.
              Free listings for all businesses, premium features to drive revenue.
            </p>
          </div>

          <div className="mt-10 rounded-lg bg-[#1e3a8a] p-5 sm:p-6 shadow-lg">
            <HomeSearch cities={cities} categories={categories} />
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-white/95">
            {[
              { label: 'Cities', value: String(cities.length) },
              { label: 'Categories', value: String(categories.length) },
              { label: 'Featured', value: 'Hand-picked' },
              { label: 'Curated', value: 'Request-only' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/10 p-4">
                <div className="text-xs font-bold text-white/85">{item.label}</div>
                <div className="mt-1 text-lg font-extrabold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main>
        {/* Browse Categories */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Browse by category</h2>
                <p className="mt-2 text-slate-600">
                  Quick entry points for high-intent searches.
                </p>
              </div>
              <Link
                href="/businesses"
                className="hidden sm:inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Browse all →
              </Link>
            </div>

            {/*
              Gradient palette inspired by newhome.png card accents.
              Applied by index to keep layout simple and fast.
            */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                (() => {
                  const gradients = [
                    ['rgba(2,132,199,0.92)', 'rgba(30,64,175,0.92)'],
                    ['rgba(16,185,129,0.90)', 'rgba(13,148,136,0.92)'],
                    ['rgba(79,70,229,0.90)', 'rgba(126,34,206,0.90)'],
                    ['rgba(245,158,11,0.92)', 'rgba(234,88,12,0.92)'],
                  ]
                  const [g1, g2] = gradients[i % gradients.length]
                  const photo = pickPexelsPhotoUrl(pexels, i + 2)
                  const iconKey = cat.toLowerCase()
                  const icon = (() => {
                    // Simple inline icons (no background) per category
                    if (iconKey.includes('food')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M8 3v8M12 3v8M16 3v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M6 11h12M10 11v10M14 11v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('home')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )
                    }
                    if (iconKey.includes('health')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('beauty')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 3c3 3 6 5 6 9a6 6 0 1 1-12 0c0-4 3-6 6-9Z" stroke="currentColor" strokeWidth="2" />
                          <path d="M10 14c.5 1.5 3.5 1.5 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('automotive')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M7 16l1-4h8l1 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M6.5 16h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M8 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
                          <path d="M9 8h6l1 4H8l1-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('shopping')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M6 8h12l-1 13H7L6 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <path d="M9 8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('professional')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('entertainment')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M6 4h12v12H6V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <path d="M10 9l5 3-5 3V9Z" fill="currentColor" />
                          <path d="M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('travel')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M2 16l20-6-20-6 6 6-6 6Z" fill="currentColor" />
                          <path d="M8 10h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('education')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <path d="M6 10v6c2 2 10 2 12 0v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )
                    }
                    if (iconKey.includes('pets')) {
                      return (
                        <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M7.5 14.5c-1.5 1-2.5 2.3-2.5 3.5 0 1.7 2 3 7 3s7-1.3 7-3c0-1.2-1-2.5-2.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
                          <path d="M12 14a2 2 0 1 0-2-2 2 2 0 0 0 2 2Z" fill="currentColor" />
                        </svg>
                      )
                    }
                    // Default: tag icon
                    return (
                      <svg className="h-6 w-6 text-white/95" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M7 7h.01M3 12V7a4 4 0 0 1 4-4h5c.5 0 1 .2 1.4.6l7 7a2 2 0 0 1 0 2.8l-7 7a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )
                  })()
                  return (
                <Link
                  key={cat}
                  href={`/businesses?category=${encodeURIComponent(cat)}`}
                  className="group rounded-lg p-5 shadow-md hover:shadow-lg transition-shadow bg-center bg-cover"
                  style={{
                    backgroundImage: photo
                      ? `linear-gradient(135deg, ${g1}, ${g2}), url('${photo}')`
                      : `linear-gradient(135deg, ${g1}, ${g2})`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-white">{cat}</div>
                    <div className="shrink-0">{icon}</div>
                  </div>
                  <p className="mt-3 text-sm text-white/85">
                    Explore top businesses in {cat.toLowerCase()}.
                  </p>
                </Link>
                  )
                })()
              ))}
            </div>

            <div className="mt-6 sm:hidden">
              <Link
                href="/businesses"
                className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Browse all →
              </Link>
            </div>
          </div>
        </section>

        {/* Hot Deals Section */}
        {featuredDeals.length > 0 && (
          <section className="py-14 sm:py-16 border-t border-slate-200">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">🔥 Hot Deals This Week</h2>
                  <p className="mt-2 text-slate-600">
                    Limited-time vouchers from local businesses
                  </p>
                </div>
                <Link
                  href="/deals"
                  className="hidden sm:inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Browse all deals →
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>

              <div className="mt-6 sm:hidden">
                <Link
                  href="/deals"
                  className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Browse all deals →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Featured Listings */}
        <section className="py-14 sm:py-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Featured local favorites</h2>
                <p className="mt-2 text-slate-600">
                  Spotlight listings hand-picked for quality and relevance.
                </p>
              </div>
              <Link
                href="/businesses"
                className="hidden sm:inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                View directory →
              </Link>
            </div>

            <div className="mt-8">
              <FeaturedBusinessesDisplay fallbackImages={featuredFallbackImages} />
            </div>
          </div>
        </section>

        {/* Explore by city */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Explore by city</h2>
                <p className="mt-2 text-slate-600">
                  Local browsing that supports long-tail discovery.
                </p>
              </div>
              <Link
                href="/businesses"
                className="hidden sm:inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                View all →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {cities.map((c, i) => {
                const gradients = [
                  ['rgba(2,132,199,0.86)', 'rgba(30,64,175,0.88)'],
                  ['rgba(16,185,129,0.86)', 'rgba(13,148,136,0.88)'],
                  ['rgba(79,70,229,0.86)', 'rgba(126,34,206,0.88)'],
                  ['rgba(245,158,11,0.88)', 'rgba(234,88,12,0.88)'],
                  ['rgba(6,182,212,0.86)', 'rgba(2,132,199,0.88)'],
                ]
                const [g1, g2] = gradients[i % gradients.length]
                const photo = pickPexelsPhotoUrl(pexels, 20 + i)
                return (
                  <Link
                    key={c}
                    href={`/businesses?city=${encodeURIComponent(c)}`}
                    className="rounded-lg px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:shadow-md transition-shadow text-center bg-center bg-cover"
                    style={{
                      backgroundImage: photo
                        ? `linear-gradient(90deg, ${g1}, ${g2}), url('${photo}')`
                        : `linear-gradient(90deg, ${g1}, ${g2})`,
                    }}
                  >
                    {c}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14 sm:py-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
            <p className="mt-2 text-slate-600 max-w-2xl">
              A simple flow that keeps discovery quick and decisions confident.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-sm font-semibold text-slate-900">1) Search</div>
                <p className="mt-2 text-sm text-slate-600">
                  Find services, restaurants, shops, and local deals by keyword.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-sm font-semibold text-slate-900">2) Compare</div>
                <p className="mt-2 text-sm text-slate-600">
                  Check details, categories, and locations before you choose.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-sm font-semibold text-slate-900">3) Support local</div>
                <p className="mt-2 text-sm text-slate-600">
                  Discover favorites and keep your spending in the community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900">What locals are saying</h2>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Social proof that builds trust and keeps the directory human.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <figure
                  key={`${t.name}-${t.city}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <blockquote className="text-sm text-slate-700">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-slate-900">
                    {t.name}{' '}
                    <span className="font-normal text-slate-500">· {t.city}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Blog */}
        <section className="py-14 sm:py-16 border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">From the blog</h2>
                <p className="mt-2 text-slate-600">
                  Local stories, spotlights, and updates across {countyName}.
                </p>
              </div>
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                View all →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-44 bg-gradient-to-br from-blue-900 to-sky-600">
                    {post.featuredImageUrl ? (
                      <img
                        src={post.featuredImageUrl}
                        alt={post.featuredImageAlt || post.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : null}
                    <div className="absolute left-4 top-4">
                      <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                        {post.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                      <div className="text-xs font-semibold text-white/85">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Draft'}
                      </div>
                      <div className="mt-1 text-base font-bold text-white line-clamp-2">
                        {post.title}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-sm text-slate-600 line-clamp-3">{post.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                        Read article
                      </div>
                      <span className="inline-flex items-center rounded-md bg-[#2563eb] px-3 py-2 text-xs font-bold text-white group-hover:bg-[#1d4ed8]">
                        Read
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 sm:hidden">
              <Link
                href="/blog"
                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-slate-50"
              >
                View all blog posts →
              </Link>
            </div>
          </div>
        </section>

        {/* Business CTA */}
        <section className="py-14 sm:py-16 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-slate-950 px-6 py-10 sm:px-10 sm:py-12 text-white overflow-hidden relative">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.35),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.28),transparent_45%)]" />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Own a business? Get discovered locally.
                </h2>
                <p className="mt-3 text-white/80 max-w-2xl">
                  Create or claim your listing and start showing up when locals search.
                  Keep your details up to date and build trust with customers nearby.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/request-listing"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white/90"
                  >
                    Request a listing
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Vendor login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicFooter countyName={countyName} state={state} />
      </main>

      <AdminQuickNav />
    </div>
  )
}

