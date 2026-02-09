'use server';

 import { revalidatePath } from 'next/cache'
 import { redirect } from 'next/navigation'
 import { headers } from 'next/headers'
 import { NextRequest } from 'next/server'
import { resolveCountyFromDomain } from '@/lib/geography'
import { prisma } from '@/lib/prisma'
import { BlogPostStatus } from '@prisma/client'
import { generateAndPublishArticle } from '@/lib/ai-blog-generator'

async function getCurrentCountyId(): Promise<string> {
  const headerStore = await headers()
  const host = headerStore.get('host') ?? headerStore.get('x-forwarded-host')

  if (!host) {
    throw new Error('Unable to resolve county without a host header')
  }

  const forwardedHost = headerStore.get('x-forwarded-host')

  const requestHeaders = new Headers()
  requestHeaders.set('host', host)
  if (forwardedHost) {
    requestHeaders.set('x-forwarded-host', forwardedHost)
  }

  const countyResult = await resolveCountyFromDomain(
     new NextRequest(`https://${host}`, {
       headers: requestHeaders,
     })
   )

   if (!countyResult.success || !countyResult.data) {
     throw new Error('County not found')
   }

   return countyResult.data.id
 }

 interface GetBlogPostsOptions {
   category?: string
   limit?: number
   featured?: boolean
 }

 export async function getBlogPosts(options?: GetBlogPostsOptions) {
   try {
     const countyId = await getCurrentCountyId()

     const where = {
       countyId,
       status: BlogPostStatus.PUBLISHED,
       ...(options?.category && { category: options.category }),
       ...(options?.featured && { isFeatured: true }),
     }

     const orderBy = options?.featured
       ? [{ featuredOrder: 'asc' as const }, { publishedAt: 'desc' as const }]
       : [{ publishedAt: 'desc' as const }]

     const posts = await prisma.blogPost.findMany({
       where,
       orderBy,
       take: options?.limit,
       select: {
         id: true,
         title: true,
         slug: true,
         excerpt: true,
         featuredImageUrl: true,
         featuredImageAlt: true,
         category: true,
         publishedAt: true,
         isFeatured: true,
         featuredOrder: true,
         status: true,
       },
     })

     return posts
   } catch (error) {
     console.log('BlogPost table not available:', error)
     return []
   }
 }

 export async function getBlogPostBySlug(slug: string) {
   try {
     const countyId = await getCurrentCountyId()

     const post = await prisma.blogPost.findUnique({
       where: {
         countyId_slug: {
           countyId,
           slug,
         },
       },
       include: {
         author: {
           select: {
             id: true,
             email: true,
           },
         },
       },
     })

     return post
   } catch (error) {
     console.log('BlogPost table not available:', error)
     return null
   }
 }

 export async function getFeaturedBlogPosts(limit: number = 3) {
   return getBlogPosts({ featured: true, limit })
 }

 export async function createBlogPost(formData: FormData) {
   try {
     const countyId = await getCurrentCountyId()

     const title = formData.get('title') as string
     const slug = formData.get('slug') as string
     const excerpt = formData.get('excerpt') as string
     const content = formData.get('content') as string
     const featuredImageUrl = (formData.get('featuredImageUrl') as string) || null
     const category = (formData.get('category') as string) || ''
     const status = (formData.get('status') as BlogPostStatus) ?? BlogPostStatus.DRAFT

     const post = await prisma.blogPost.create({
       data: {
         countyId,
         title,
         slug,
         excerpt,
         content,
         featuredImageUrl,
         category,
         status,
         publishedAt: status === BlogPostStatus.PUBLISHED ? new Date() : null,
       },
     })

     revalidatePath('/blog')
     revalidatePath('/')

     return post
   } catch (error) {
     console.error('Error creating blog post:', error)
     throw new Error('BlogPost table not available. Please set up the blog system first.')
   }
 }

 export async function updateBlogPost(id: string, formData: FormData) {
   try {
     const title = formData.get('title') as string
     const slug = formData.get('slug') as string
     const excerpt = formData.get('excerpt') as string
     const content = formData.get('content') as string
     const featuredImageUrl = (formData.get('featuredImageUrl') as string) || null
     const category = (formData.get('category') as string) || ''
     const status = (formData.get('status') as BlogPostStatus) ?? BlogPostStatus.DRAFT
     const isFeatured = formData.get('isFeatured') === 'true'
     const featuredOrderValue = formData.get('featuredOrder')
     const featuredOrder = featuredOrderValue ? parseInt(featuredOrderValue as string, 10) : null

     const existing = await prisma.blogPost.findUnique({ where: { id } })

     const post = await prisma.blogPost.update({
       where: { id },
       data: {
         title,
         slug,
         excerpt,
         content,
         featuredImageUrl,
         category,
         status,
         isFeatured,
         featuredOrder,
         ...(status === BlogPostStatus.PUBLISHED && !existing?.publishedAt && {
           publishedAt: new Date(),
         }),
       },
     })

     revalidatePath('/blog')
     revalidatePath(`/blog/${slug}`)
     revalidatePath('/')

     return post
   } catch (error) {
     console.error('Error updating blog post:', error)
     throw new Error('BlogPost table not available. Please set up the blog system first.')
   }
 }

 export async function deleteBlogPost(id: string) {
   try {
     await prisma.blogPost.delete({
       where: { id },
     })

     revalidatePath('/blog')
     revalidatePath('/')

     redirect('/admin/blog')
   } catch (error) {
     console.error('Error deleting blog post:', error)
     throw new Error('BlogPost table not available. Please set up the blog system first.')
   }
 }

export async function getAllBlogPostsAdmin() {
  const countyId = await getCurrentCountyId()

  const fetchPosts = () =>
    prisma.blogPost.findMany({
      where: { countyId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        author: {
          select: {
            email: true,
          },
        },
      },
    })

  let posts = await fetchPosts()

  if (posts.length === 0) {
    console.log('No blog posts found for county, generating AI article...')
    await generateAndPublishArticle(countyId)
    posts = await fetchPosts()
  }

  return posts
}

 export async function getBlogPostById(id: string) {
   try {
     const post = await prisma.blogPost.findUnique({
       where: { id },
     })

     return post
   } catch (error) {
     console.log('BlogPost table not available:', error)
     return null
   }
 }
