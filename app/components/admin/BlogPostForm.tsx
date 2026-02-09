'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBlogPost, updateBlogPost, deleteBlogPost } from '@/app/actions/blog-actions'
import { BlogPost, BlogPostStatus } from '@prisma/client'

interface BlogPostFormProps {
  post?: BlogPost
}

const categories = [
  { id: 'local_news', name: 'Local News' },
  { id: 'business_spotlight', name: 'Business Spotlight' },
  { id: 'events', name: 'Events' },
  { id: 'food_dining', name: 'Food & Dining' },
  { id: 'community', name: 'Community' },
]

export default function BlogPostForm({ post }: BlogPostFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)

    try {
      if (post) {
        await updateBlogPost(post.id, formData)
      } else {
        await createBlogPost(formData)
      }
      router.push('/admin/blog')
      router.refresh()
    } catch (error) {
      console.error('Error saving post:', error)
      alert('Error saving post')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post) return
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeleting(true)
    try {
      await deleteBlogPost(post.id)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error deleting post')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={post?.title}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
          Slug (URL)
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          defaultValue={post?.slug}
          required
          placeholder="my-blog-post"
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          URL-safe version (lowercase, hyphens, no spaces)
        </p>
      </div>

      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-slate-700">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={3}
          defaultValue={post?.excerpt}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Short summary shown in listings
        </p>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-slate-700">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={20}
          defaultValue={post?.content}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          HTML or Markdown content
        </p>
      </div>

      <div>
        <label htmlFor="featuredImageUrl" className="block text-sm font-medium text-slate-700">
          Featured Image URL
        </label>
        <input
          type="url"
          id="featuredImageUrl"
          name="featuredImageUrl"
          defaultValue={post?.featuredImageUrl || ''}
          placeholder="https://example.com/image.jpg"
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={post?.category || 'community'}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={post?.status || BlogPostStatus.DRAFT}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value={BlogPostStatus.DRAFT}>Draft</option>
          <option value={BlogPostStatus.PUBLISHED}>Published</option>
          <option value={BlogPostStatus.ARCHIVED}>Archived</option>
        </select>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="isFeatured"
          name="isFeatured"
          value="true"
          defaultChecked={post?.isFeatured}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <label htmlFor="isFeatured" className="text-sm font-medium text-slate-700">
            Featured on homepage
          </label>
          <p className="text-xs text-slate-500">
            Show this post in the homepage featured section
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="featuredOrder" className="block text-sm font-medium text-slate-700">
          Featured Order (optional)
        </label>
        <input
          type="number"
          id="featuredOrder"
          name="featuredOrder"
          defaultValue={post?.featuredOrder ?? ''}
          min="0"
          className="mt-1 block w-20 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Lower numbers appear first (0, 1, 2...)
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 pt-6 border-t">
        <div>
          {post && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Post'}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
          </button>
        </div>
      </div>
    </form>
  )
}
