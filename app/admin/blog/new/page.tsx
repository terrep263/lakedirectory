import BlogPostForm from '@/app/components/admin/BlogPostForm'

export default function NewBlogPostPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Create New Blog Post</h1>
        <p className="mt-2 text-slate-600">Write and publish a new blog post</p>
      </div>

      <BlogPostForm />
    </div>
  )
}
