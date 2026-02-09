import { notFound } from 'next/navigation'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { getBlogPostBySlug } from '@/app/actions/blog-actions'
import { BlogPostStatus } from '@prisma/client'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post || post.status !== BlogPostStatus.PUBLISHED) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <article>
          {post.featuredImageUrl && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={post.featuredImageUrl}
                alt={post.featuredImageAlt || post.title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-800">
              {post.category.replace('_', ' ')}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 text-sm text-slate-600 mb-8 pb-8 border-b border-slate-200">
            {post.publishedAt && (
              <time dateTime={post.publishedAt.toISOString()}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>

          <div
            className="prose prose-lg prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>

      <PublicFooter countyName="Lake County" state="Florida" />
    </div>
  )
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post || post.status !== BlogPostStatus.PUBLISHED) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: `${post.title} | Lake County Local Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      images: post.featuredImageUrl
        ? [
            {
              url: post.featuredImageUrl,
              alt: post.featuredImageAlt || post.title,
            },
          ]
        : undefined,
    },
  }
}
