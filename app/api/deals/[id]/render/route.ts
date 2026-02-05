import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/deals/[id]/render
 * 
 * Retrieves a deal and automatically generates surface-specific renderings
 * from its canonical description.
 * 
 * Purpose:
 * - Single source of truth (canonical description)
 * - Automatic mobile/desktop/SEO rendering
 * - Vendors never manage multiple versions
 * - No meaning, pricing, or claim alterations
 */

interface DealRenderingResponse {
  success: boolean
  deal: {
    id: string
    title: string
    canonicalDescription: string
    businessId: string
    dealStatus: string
  }
  renderings: {
    mobile: {
      preview: string
      characterCount: number
    }
    desktop: {
      copy: string
    }
    seo: {
      expandedCopy: string
      metaDescription: string
      structuredData: any
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Retrieve deal from database
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Not Found: Deal does not exist' },
        { status: 404 }
      )
    }

    // Generate simple renderings from deal title (no canonical description)
    const renderings = generateDealRenderings({
      canonicalDescription: deal.title, // Use title as fallback
      vendorName: deal.business.name,
      dealTitle: deal.title
    })

    const response: DealRenderingResponse = {
      success: true,
      deal: {
        id: deal.id,
        title: deal.title,
        canonicalDescription: deal.title, // Simplified
        businessId: deal.businessId,
        dealStatus: deal.dealStatus
      },
      renderings
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Deal rendering error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * Generate all surface-specific renderings from canonical description
 * 
 * Rendering strategies:
 * - Mobile: Concise, deal-first, 80-140 chars
 * - Desktop: Natural reading, slightly expanded
 * - SEO: Keyword-rich, crawlable, structured data
 */
function generateDealRenderings(input: {
  canonicalDescription: string
  vendorName?: string
  dealTitle?: string
}): DealRenderingResponse['renderings'] {
  const { canonicalDescription, vendorName, dealTitle } = input

  // Mobile rendering: concise, scannable, front-loaded value
  const mobile = renderMobilePreview(canonicalDescription)

  // Desktop rendering: natural reading experience
  const desktop = renderDesktopCopy(canonicalDescription, vendorName)

  // SEO rendering: expanded with keywords and structured data
  const seo = renderSEOCopy(canonicalDescription, vendorName, dealTitle)

  return {
    mobile: {
      preview: mobile,
      characterCount: mobile.length
    },
    desktop: {
      copy: desktop
    },
    seo: {
      expandedCopy: seo.expandedCopy,
      metaDescription: seo.metaDescription,
      structuredData: seo.structuredData
    }
  }
}

/**
 * Mobile rendering: concise preview for listing cards
 * 
 * Strategy:
 * - Extract first sentence (value proposition)
 * - Remove verbose phrases
 * - Target: 80-140 characters
 * - Front-load discount and item
 */
function renderMobilePreview(canonicalDescription: string): string {
  const sentences = canonicalDescription.split(/\.\s+/)
  let preview = sentences[0] || canonicalDescription

  // Simplify for mobile (concise, scannable)
  preview = preview
    .replace(/brings your cost down from/gi, '→')
    .replace(/to just/gi, '')
    .replace(/This .+ deal\./gi, '')
    .trim()

  // Ensure proper ending
  if (!preview.endsWith('.') && !preview.endsWith('!')) {
    preview += '.'
  }

  // Truncate at word boundary if too long
  if (preview.length > 140) {
    const truncated = preview.substring(0, 137)
    const lastSpace = truncated.lastIndexOf(' ')
    // Always truncate at word boundary (unless impossible)
    if (lastSpace > 80) {
      preview = truncated.substring(0, lastSpace).trim() + '...'
    } else {
      // If no good space found, just truncate (edge case)
      preview = truncated.trim() + '...'
    }
  }

  return preview
}

/**
 * Desktop rendering: natural reading experience
 * 
 * Strategy:
 * - Use canonical as-is (it's already well-formed)
 * - May add vendor context prefix if helpful
 * - No character limits
 * - Preserve all details
 */
function renderDesktopCopy(
  canonicalDescription: string,
  vendorName?: string
): string {
  let desktopCopy = canonicalDescription

  // Add vendor context if available and not already mentioned
  if (vendorName && !canonicalDescription.includes(vendorName)) {
    desktopCopy = `${vendorName} offers: ${canonicalDescription}`
  }

  return desktopCopy
}

/**
 * SEO rendering: keyword-rich copy with structured data
 * 
 * Strategy:
 * - Expand abbreviations for search engines
 * - Add semantic keywords
 * - Generate meta description (≤160 chars)
 * - Generate Schema.org structured data
 */
function renderSEOCopy(
  canonicalDescription: string,
  vendorName?: string,
  dealTitle?: string
): {
  expandedCopy: string
  metaDescription: string
  structuredData: any
} {
  let expandedCopy = canonicalDescription

  // Expand abbreviations for SEO
  expandedCopy = expandedCopy
    .replace(/\b(\d+)%/gi, '$1 percent')
    .replace(/\bGet\b/g, 'Discover')
    .replace(/\bgrab\b/gi, 'secure')

  // Add vendor prefix if available
  if (vendorName && dealTitle) {
    expandedCopy = `${dealTitle} from ${vendorName}: ${expandedCopy}`
  }

  // Add closing call-to-action (SEO-friendly, no urgency)
  if (!expandedCopy.match(/available|redeem|claim/i)) {
    expandedCopy += ' Available for redemption through Lake County Local.'
  }

  // Generate meta description (search snippet)
  let metaDescription: string
  if (vendorName && dealTitle) {
    metaDescription = `${dealTitle} at ${vendorName}. ${canonicalDescription.split(/\.\s+/)[0]}.`
  } else {
    metaDescription = canonicalDescription.split(/\.\s+/)[0] + '.'
  }

  // Ensure meta fits within optimal length
  if (metaDescription.length > 160) {
    metaDescription = metaDescription.substring(0, 157) + '...'
  }

  // Generate Schema.org structured data
  const structuredData: any = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: dealTitle || "Special Deal",
    description: canonicalDescription,
    availability: "https://schema.org/InStock"
  }

  // Add seller if available
  if (vendorName) {
    structuredData.seller = {
      "@type": "Organization",
      name: vendorName
    }
  }

  return {
    expandedCopy,
    metaDescription,
    structuredData
  }
}
