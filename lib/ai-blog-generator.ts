/**
 * AI-Powered Blog Content Generator
 * Automatically creates newspaper-style articles about businesses and cities
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ArticleGenerationResult {
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  featuredImagePrompt: string
}

/**
 * Article Types for Variety
 */
const ARTICLE_TYPES = [
  {
    type: 'business_spotlight',
    weight: 30,
    prompt: 'Write a compelling newspaper-style spotlight article about {business} in {city}. Highlight their story, what makes them unique, and why locals should visit. Write like a local news reporter doing an expose.',
  },
  {
    type: 'city_guide',
    weight: 25,
    prompt: 'Write an engaging city guide article about {city}, {state}. Feature {count} local businesses and what makes this city special. Write in an informative, newspaper feature style.',
  },
  {
    type: 'industry_roundup',
    weight: 20,
    prompt: 'Write a comprehensive roundup of the best {category} businesses across Lake County. Compare and contrast {count} businesses, highlighting what makes each unique. Newspaper expose style.',
  },
  {
    type: 'seasonal_deals',
    weight: 15,
    prompt: 'Write an article about current seasonal deals and offers in {city}. Feature {count} businesses with active promotions. Make it feel timely and newsworthy.',
  },
  {
    type: 'hidden_gems',
    weight: 10,
    prompt: 'Write a "Hidden Gems" article uncovering lesser-known businesses in {city} that deserve attention. Feature {count} businesses. Investigative journalism style.',
  },
]

/**
 * Select article type based on weighted probability
 */
function selectArticleType(): typeof ARTICLE_TYPES[0] {
  const totalWeight = ARTICLE_TYPES.reduce((sum, type) => sum + type.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const type of ARTICLE_TYPES) {
    random -= type.weight
    if (random <= 0) return type
  }
  
  return ARTICLE_TYPES[0]
}

/**
 * Get businesses that haven't been featured recently
 */
async function getUnfeaturedBusinesses(countyId: string, limit: number = 10) {
  // Get businesses featured in last 30 days
  const recentArticles = await prisma.blogPost.findMany({
    where: {
      countyId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      content: true,
    },
  })

  // Extract business names from content (simple approach)
  const featuredBusinessNames = new Set(
    recentArticles.flatMap(post => {
      const matches = post.content.match(/\*\*([^*]+)\*\*/g) || []
      return matches.map(m => m.replace(/\*\*/g, ''))
    })
  )

  // Get businesses not recently featured, prioritize founders
  const businesses = await prisma.business.findMany({
    where: {
      countyId,
      subscriptionStatus: 'ACTIVE',
    },
    include: {
      founderStatus: {
        select: {
          isActive: true,
        },
      },
      deals: {
        where: {
          dealStatus: 'ACTIVE',
        },
        take: 1,
      },
    },
    orderBy: [
      { founderStatus: { isActive: 'desc' } },
      { createdAt: 'desc' },
    ],
    take: 100,
  })

  // Filter out recently featured
  const unfeatured = businesses.filter(
    b => !featuredBusinessNames.has(b.name)
  )

  return unfeatured.slice(0, limit)
}

/**
 * Get all cities with active businesses
 */
async function getCitiesWithBusinesses(countyId: string) {
  const businesses = await prisma.business.findMany({
    where: {
      countyId,
      subscriptionStatus: 'ACTIVE',
    },
    select: {
      city: true,
    },
    distinct: ['city'],
  })

  return businesses.map(b => b.city).filter(Boolean) as string[]
}

/**
 * Generate article using OpenAI
 */
async function generateArticleContent(
  articleType: typeof ARTICLE_TYPES[0],
  businesses: any[],
  city: string,
  category?: string
): Promise<ArticleGenerationResult> {
  const businessDetails = businesses.map(b => ({
    name: b.name,
    category: b.category,
    description: b.description,
    city: b.city,
    isFounder: b.founderStatus?.isActive || false,
    hasDeals: b.deals?.length > 0,
  }))

  const prompt = articleType.prompt
    .replace('{business}', businesses[0]?.name || 'a local business')
    .replace('{city}', city)
    .replace('{state}', 'Florida')
    .replace(/{count}/g, businesses.length.toString())
    .replace('{category}', category || 'local')

  const systemPrompt = `You are a professional local news journalist writing for Lake County Local, a community directory and news platform. 

Write engaging, newspaper-style articles that:
- Are 800-1200 words long
- Use clear, compelling headlines
- Include an engaging lead paragraph
- Feature real business details from the data provided
- Use subheadings to break up content
- Write in active voice with vivid details
- Include quotes (you can create realistic owner quotes)
- End with a call-to-action to visit the businesses
- Use markdown formatting (## for headers, ** for bold)
- Be factual but engaging - this is real journalism
- Never mention this is AI-generated

Business Data:
${JSON.stringify(businessDetails, null, 2)}

Article Type: ${articleType.type}
Target City: ${city}
${category ? `Focus Category: ${category}` : ''}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content || ''

    // Generate title
    const titleCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a headline writer. Create a compelling, click-worthy newspaper headline (8-12 words max). Return ONLY the headline, no quotes or extra text.',
        },
        {
          role: 'user',
          content: `Create a headline for this article:\n\n${content.slice(0, 500)}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 50,
    })

    const title = titleCompletion.choices[0]?.message?.content?.trim() || 'Local Business Spotlight'

    // Generate excerpt
    const excerptCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Create a compelling 2-sentence excerpt that summarizes the article and makes people want to read more. Return ONLY the excerpt.',
        },
        {
          role: 'user',
          content: `Create excerpt for:\n\n${content.slice(0, 500)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    const excerpt = excerptCompletion.choices[0]?.message?.content?.trim() || ''

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)

    // Determine category
    let articleCategory = 'LOCAL_NEWS'
    if (articleType.type === 'business_spotlight') articleCategory = 'BUSINESS_SPOTLIGHT'
    if (articleType.type === 'city_guide') articleCategory = 'CITY_GUIDE'
    if (articleType.type === 'industry_roundup') articleCategory = 'INDUSTRY_ROUNDUP'
    if (articleType.type === 'seasonal_deals') articleCategory = 'DEALS_AND_EVENTS'

    // Generate image prompt
    const imagePrompt = `Professional photo of ${city}, Florida featuring local businesses. Bright, inviting, community-focused. Photojournalism style.`

    return {
      title,
      slug,
      excerpt,
      content,
      category: articleCategory,
      featuredImagePrompt: imagePrompt,
    }
  } catch (error) {
    console.error('Error generating article:', error)
    throw error
  }
}

/**
 * Generate and publish a new article
 */
export async function generateAndPublishArticle(countyId: string): Promise<string> {
  try {
    console.log('🤖 Starting AI article generation...')

    // Select article type
    const articleType = selectArticleType()
    console.log(`📰 Article type: ${articleType.type}`)

    // Get unfeatured businesses
    const businesses = await getUnfeaturedBusinesses(countyId, 5)
    
    if (businesses.length === 0) {
      console.log('⚠️  No businesses available for articles')
      return 'No businesses available'
    }

    // Get random city with businesses
    const cities = await getCitiesWithBusinesses(countyId)
    const city = cities[Math.floor(Math.random() * cities.length)]

    console.log(`📍 Selected city: ${city}`)
    console.log(`🏢 Selected ${businesses.length} businesses`)

    // Generate article content
    console.log('✍️  Generating article with OpenAI...')
    const article = await generateArticleContent(
      articleType,
      businesses.slice(0, 3), // Use top 3 businesses
      city,
      businesses[0]?.category
    )

    console.log(`📝 Generated: "${article.title}"`)

    // TODO: Generate featured image using DALL-E
    // For now, use placeholder or Pexels
    const featuredImageUrl = `https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200`

    // Create blog post
    const post = await prisma.blogPost.create({
      data: {
        countyId,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        featuredImageUrl,
        featuredImageAlt: `${city}, Florida local businesses`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        isFeatured: false,
      },
    })

    console.log(`✅ Published: /blog/${post.slug}`)
    
    return post.id
  } catch (error) {
    console.error('❌ Error generating article:', error)
    throw error
  }
}

/**
 * Run the weekly article generator (called by cron)
 */
export async function runWeeklyArticleGenerator() {
  try {
    // Get all counties (for multi-county support)
    const counties = await prisma.county.findMany({
      select: { id: true, name: true },
    })

    for (const county of counties) {
      console.log(`\n📰 Generating article for ${county.name}...`)
      await generateAndPublishArticle(county.id)
    }

    console.log('\n✅ Weekly article generation complete!')
  } catch (error) {
    console.error('❌ Weekly article generation failed:', error)
    throw error
  }
}
