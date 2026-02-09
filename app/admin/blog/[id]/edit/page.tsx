import { notFound } from 'next/navigation'
import BlogPostForm from '@/app/components/admin/BlogPostForm'
import { getBlogPostById } from '@/app/actions/blog-actions'

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params
  const post = await getBlogPostById(id)

  if (!post) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Edit Blog Post</h1>
        <p className="mt-2 text-slate-600">Update your blog post</p>
      </div>

      <BlogPostForm post={post} />
    </div>
  )
}
