/**
 * Cron Job Configuration
 * Runs AI blog generator 3x per week: Monday, Wednesday, Friday at 6:00 AM EST
 */

import { runWeeklyArticleGenerator } from '@/lib/ai-blog-generator'

export const dynamic = 'force-dynamic'

/**
 * Vercel Cron Job Handler
 * This endpoint is called by Vercel Cron on schedule
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log('🕐 Cron job triggered: AI Blog Generator')
    
    // Run the article generator
    await runWeeklyArticleGenerator()
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Article generation complete',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Cron job error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
