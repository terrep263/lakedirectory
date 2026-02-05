import { NextRequest, NextResponse } from 'next/server'

/**
 * Deal Rendering Adapter
 * 
 * Purpose: Transform canonical deal descriptions into surface-specific presentations
 * 
 * Scope:
 * - Takes canonical description from Deal Guard
 * - Produces mobile-optimized preview copy (listings)
 * - Produces expanded SEO-friendly copy (detail pages)
 * - Does NOT change meaning, pricing, or claims
 * - Vendors never manage multiple versions
 * - Rendering is automatic and presentation-only
 * 
 * This is a pure presentation layer - no database writes, no voucher logic
 */

interface RenderRequest {
  canonicalDescription: string
  vendorName?: string
  industry?: string
  itemOrService?: string
  regularPrice?: number
  dealPrice?: number
}

interface RenderResponse {
  mobile: {
    preview: string
    characterCount: number
  }
  seo: {
    expandedCopy: string
    metaDescription: string
    structuredData: {
      "@context": string
      "@type": string
      name: string
      description: string
      offers?: {
        "@type": string
        price?: string
        priceCurrency?: string
        availability?: string
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required field
    if (!body.canonicalDescription || typeof body.canonicalDescription !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: canonicalDescription is required and must be a string' },
        { status: 400 }
      )
    }

    const renderRequest: RenderRequest = {
      canonicalDescription: body.canonicalDescription,
      vendorName: body.vendorName,
      industry: body.industry,
      itemOrService: body.itemOrService,
      regularPrice: body.regularPrice ? parseFloat(body.regularPrice) : undefined,
      dealPrice: body.dealPrice ? parseFloat(body.dealPrice) : undefined
    }

    // Generate surface-specific renderings
    const rendering = renderDealDescription(renderRequest)

    return NextResponse.json({
      success: true,
      rendering
    })
  } catch (error) {
    console.error('Deal rendering error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function renderDealDescription(request: RenderRequest): RenderResponse {
  // Mobile preview: Concise, scannable, front-loaded value
  const mobilePreview = renderMobilePreview(request)

  // SEO copy: Expanded, keyword-rich, crawlable
  const seoExpanded = renderSEOCopy(request)
  const metaDescription = renderMetaDescription(request)
  const structuredData = renderStructuredData(request)

  return {
    mobile: {
      preview: mobilePreview,
      characterCount: mobilePreview.length
    },
    seo: {
      expandedCopy: seoExpanded,
      metaDescription,
      structuredData
    }
  }
}

function renderMobilePreview(request: RenderRequest): string {
  const { canonicalDescription } = request
  
  // Extract key components from canonical description
  const sentences = canonicalDescription.split(/\.\s+/)
  
  // Mobile preview strategy:
  // - Lead with value (first sentence usually has discount)
  // - Add item/vendor if space permits
  // - Target: 80-120 characters (2-3 lines on mobile)
  // - Remove verbose phrases
  
  let preview = sentences[0] || canonicalDescription
  
  // Simplify language for mobile
  preview = preview
    .replace(/brings your cost down from/gi, '→')
    .replace(/to just/gi, '')
    .replace(/This .+ deal\./gi, '')
  
  // Ensure it ends properly
  if (!preview.endsWith('.')) {
    preview += '.'
  }
  
  // If still too long, truncate at word boundary
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
  
  return preview.trim()
}

function renderSEOCopy(request: RenderRequest): string {
  const { canonicalDescription, vendorName, industry, itemOrService } = request
  
  // SEO copy strategy:
  // - Expand canonical with natural keyword variations
  // - Add location context if available
  // - Include semantic richness without changing claims
  // - Target: 150-250 characters for search snippet optimization
  
  let seoCopy = canonicalDescription
  
  // Add keyword-rich introductory clause if vendor/item provided
  const intro = buildSEOIntro(vendorName, industry, itemOrService)
  if (intro) {
    seoCopy = `${intro} ${seoCopy}`
  }
  
  // Expand abbreviated phrases for SEO
  seoCopy = seoCopy
    .replace(/\b(\d+)%/gi, '$1 percent')
    .replace(/\bGet\b/g, 'Discover')
    .replace(/\bgrab\b/gi, 'secure')
  
  // Add closing call-to-action (SEO-friendly, no urgency manipulation)
  if (!seoCopy.match(/available|redeem|claim/i)) {
    seoCopy += ' Available for redemption through Lake County Local.'
  }
  
  return seoCopy.trim()
}

function buildSEOIntro(vendorName?: string, industry?: string, itemOrService?: string): string {
  if (!vendorName && !industry && !itemOrService) {
    return ''
  }
  
  const parts: string[] = []
  
  if (industry) {
    parts.push(industry)
  }
  
  if (itemOrService) {
    parts.push(`deal on ${itemOrService}`)
  } else if (industry) {
    parts.push('deal')
  }
  
  if (vendorName) {
    parts.push(`from ${vendorName}`)
  }
  
  if (parts.length === 0) return ''
  
  return parts.join(' ').replace(/\s+/g, ' ').trim() + ':'
}

function renderMetaDescription(request: RenderRequest): string {
  const { canonicalDescription, vendorName, itemOrService, regularPrice, dealPrice } = request
  
  // Meta description strategy:
  // - Optimized for search result snippets (150-160 chars)
  // - Front-load value proposition
  // - Include key terms: vendor, item, discount
  // - No HTML, clean text only
  
  let meta = ''
  
  // Calculate discount if prices provided
  let discountText = ''
  if (regularPrice && dealPrice) {
    const discountPercent = Math.round(((regularPrice - dealPrice) / regularPrice) * 100)
    discountText = `${discountPercent}% off`
  }
  
  // Build meta description
  if (itemOrService && vendorName) {
    meta = `${discountText ? discountText + ' ' : ''}${itemOrService} at ${vendorName}.`
  } else if (itemOrService) {
    meta = `${discountText ? discountText + ' ' : ''}${itemOrService}.`
  } else {
    // Fallback to first sentence of canonical
    meta = canonicalDescription.split(/\.\s+/)[0] + '.'
  }
  
  // Add pricing if available
  if (dealPrice && regularPrice) {
    meta += ` Now $${dealPrice.toFixed(2)} (reg. $${regularPrice.toFixed(2)}).`
  }
  
  // Ensure meta fits within optimal length
  if (meta.length > 160) {
    meta = meta.substring(0, 157) + '...'
  }
  
  return meta.trim()
}

function renderStructuredData(request: RenderRequest): RenderResponse['seo']['structuredData'] {
  const { canonicalDescription, vendorName, itemOrService, dealPrice } = request
  
  // Structured data strategy:
  // - Schema.org Offer format
  // - Helps search engines understand deal structure
  // - Does NOT include voucher/redemption details (outside scope)
  
  const structured: RenderResponse['seo']['structuredData'] = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: itemOrService || "Special Deal",
    description: canonicalDescription
  }
  
  // Add vendor if available
  if (vendorName) {
    structured.name = `${itemOrService || 'Deal'} - ${vendorName}`
  }
  
  // Add pricing if available
  if (dealPrice) {
    structured.offers = {
      "@type": "Offer",
      price: dealPrice.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    }
  }
  
  return structured
}
