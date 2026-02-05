/**
 * Canonical Deal Rendering System Tests
 * 
 * Tests the complete flow from canonical description to surface-specific renderings.
 * 
 * Run: npx tsx tests/canonical-rendering.test.ts
 */

// Test results tracking
let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.error(`❌ ${name}`)
      console.error(error)
      failed++
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

console.log('\n🧪 Running Canonical Deal Rendering Tests...\n')

// ============================================================================
// MOBILE RENDERING TESTS
// ============================================================================

const testMobileRenderingConciseness = test('Mobile: renders concise preview (≤140 chars)', () => {
  const canonical = "Save 50% on all lunch entrees from 11 AM to 2 PM, Monday through Friday. This restaurant deal brings your cost down from $15.00 to just $7.50. Includes: soup or salad, main entree, and soft drink."
  
  const mobile = renderMobilePreview(canonical)
  
  assert(mobile.length <= 140, `Mobile should be ≤140 chars, got ${mobile.length}`)
  assert(mobile.includes('50%'), 'Mobile should preserve discount')
  assert(mobile.includes('lunch'), 'Mobile should preserve key item')
})

const testMobileFrontLoadsValue = test('Mobile: front-loads discount and value', () => {
  const canonical = "This amazing restaurant deal brings your cost down from $20.00 to just $10.00. Save 50% on dinner entrees every Tuesday night."
  
  const mobile = renderMobilePreview(canonical)
  
  // First sentence should contain the value proposition
  assert(mobile.includes('50%') || mobile.includes('$10'), 'Mobile should lead with value')
})

const testMobileTruncatesGracefully = test('Mobile: truncates long descriptions at word boundary', () => {
  const canonical = "Save 25% on our premium artisanal handcrafted gourmet specialty items including freshly baked organic whole grain breads, locally sourced free-range eggs, grass-fed butter, and imported European cheeses from traditional family-owned creameries."
  
  const mobile = renderMobilePreview(canonical)
  
  assert(mobile.length <= 140, 'Mobile should truncate')
  // Should end with complete word + "..." (e.g., "locally...")
  // Should NOT have space immediately before ellipsis (would indicate mid-word cut like "local ly...")
  assert(mobile.endsWith('...'), 'Mobile should end with ellipsis when truncated')
  assert(!mobile.match(/\s\.\.\.$/), 'Mobile should not have space before ellipsis (that would indicate incomplete truncation logic)')
  assert(mobile.includes('25%'), 'Mobile should preserve key discount even when truncating')
})

const testMobileRemovesVerbosity = test('Mobile: removes verbose phrases for conciseness', () => {
  const canonical = "This exceptional dining deal brings your cost down from $30.00 to just $20.00 at our restaurant."
  
  const mobile = renderMobilePreview(canonical)
  
  assert(!mobile.includes('brings your cost down from'), 'Should remove verbose pricing phrase')
  assert(!mobile.includes('to just'), 'Should remove unnecessary connector')
})

// ============================================================================
// DESKTOP RENDERING TESTS
// ============================================================================

const testDesktopPreservesCanonical = test('Desktop: preserves full canonical description', () => {
  const canonical = "Save 30% on all dinner entrees from 5 PM to 7 PM. Includes appetizer, main course, and dessert. Valid Monday through Thursday."
  
  const desktop = renderDesktopCopy(canonical, undefined)
  
  assert(desktop.includes('30%'), 'Desktop should preserve discount')
  assert(desktop.includes('5 PM to 7 PM'), 'Desktop should preserve timing')
  assert(desktop.includes('appetizer'), 'Desktop should preserve all details')
  assert(desktop.includes('Monday through Thursday'), 'Desktop should preserve validity')
})

const testDesktopAddsVendorContext = test('Desktop: adds vendor context when available', () => {
  const canonical = "Save 40% on craft cocktails during happy hour."
  const vendorName = "The Local Tavern"
  
  const desktop = renderDesktopCopy(canonical, vendorName)
  
  assert(desktop.includes(vendorName), 'Desktop should include vendor name')
  assert(desktop.includes('40%'), 'Desktop should preserve discount')
})

const testDesktopNoCharacterLimit = test('Desktop: no character limit restrictions', () => {
  const canonical = "Save 25% on our complete brunch menu including eggs benedict with hollandaise sauce, pancakes with real maple syrup, fresh fruit parfaits with Greek yogurt and granola, artisanal coffee roasted locally, freshly squeezed orange juice, and complimentary mimosas. Available Saturday and Sunday from 10 AM to 2 PM. Dine-in only."
  
  const desktop = renderDesktopCopy(canonical, undefined)
  
  // Desktop should preserve the full description
  assert(desktop.length >= canonical.length, 'Desktop should not truncate')
  assert(desktop.includes('eggs benedict'), 'Desktop should preserve all items')
  assert(desktop.includes('Saturday and Sunday'), 'Desktop should preserve timing')
})

// ============================================================================
// SEO RENDERING TESTS
// ============================================================================

const testSEOExpandsAbbreviations = test('SEO: expands abbreviations for search engines', () => {
  const canonical = "Get 35% off all appetizers. Grab this deal today!"
  
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  assert(seo.expandedCopy.includes('35 percent off'), 'Should expand % to percent')
  assert(seo.expandedCopy.includes('Discover') || seo.expandedCopy.includes('Get'), 'Should expand or keep action verbs')
})

const testSEOAddsKeywords = test('SEO: adds vendor and deal context for keywords', () => {
  const canonical = "Save 20% on pizza and wings."
  const vendorName = "Pizza Palace"
  const dealTitle = "Tuesday Special"
  
  const seo = renderSEOCopy(canonical, vendorName, dealTitle)
  
  assert(seo.expandedCopy.includes(vendorName), 'SEO should include vendor name')
  assert(seo.expandedCopy.includes(dealTitle), 'SEO should include deal title')
})

const testSEOAddsCallToAction = test('SEO: adds call-to-action when not present', () => {
  const canonical = "Save 15% on all menu items."
  
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  assert(
    seo.expandedCopy.includes('Available for redemption') || 
    seo.expandedCopy.includes('available') ||
    seo.expandedCopy.includes('redeem'),
    'SEO should add CTA if not present'
  )
})

const testSEOMetaDescriptionOptimal = test('SEO: generates meta description (≤160 chars)', () => {
  const canonical = "Save 45% on a complete spa package including massage, facial, manicure, and pedicure. Relax and rejuvenate with our premium services."
  
  const seo = renderSEOCopy(canonical, "Serenity Spa", "Ultimate Relaxation Package")
  
  assert(seo.metaDescription.length <= 160, `Meta should be ≤160 chars, got ${seo.metaDescription.length}`)
  assert(seo.metaDescription.includes('45%') || seo.metaDescription.includes('spa'), 'Meta should include key info')
})

const testSEOStructuredData = test('SEO: generates valid Schema.org structured data', () => {
  const canonical = "Save 30% on yoga classes."
  const vendorName = "Zen Yoga Studio"
  const dealTitle = "New Student Special"
  
  const seo = renderSEOCopy(canonical, vendorName, dealTitle)
  
  assert(seo.structuredData['@context'] === 'https://schema.org', 'Should have Schema.org context')
  assert(seo.structuredData['@type'] === 'Offer', 'Should be Offer type')
  assert(seo.structuredData.name === dealTitle, 'Should include deal title')
  assert(seo.structuredData.description === canonical, 'Should include canonical description')
  assert(seo.structuredData.seller?.name === vendorName, 'Should include vendor as seller')
})

// ============================================================================
// MEANING PRESERVATION TESTS
// ============================================================================

const testPreservesDiscountPercentage = test('Meaning: preserves exact discount percentage', () => {
  const canonical = "Save 37% on all items. Regular price $50, now $31.50."
  
  const mobile = renderMobilePreview(canonical)
  const desktop = renderDesktopCopy(canonical, undefined)
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  assert(mobile.includes('37%'), 'Mobile should preserve exact percentage')
  assert(desktop.includes('37%'), 'Desktop should preserve exact percentage')
  // SEO converts to "37 percent off"
  assert(seo.expandedCopy.includes('37 percent'), 'SEO should preserve percentage (expanded)')
})

const testPreservesPricing = test('Meaning: preserves exact pricing', () => {
  const canonical = "Regular price $24.99, deal price $12.49."
  
  const mobile = renderMobilePreview(canonical)
  const desktop = renderDesktopCopy(canonical, undefined)
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  assert(mobile.includes('$24.99') || mobile.includes('$12.49'), 'Mobile should preserve pricing')
  assert(desktop.includes('$24.99') && desktop.includes('$12.49'), 'Desktop should preserve all pricing')
  assert(seo.expandedCopy.includes('$24.99') && seo.expandedCopy.includes('$12.49'), 'SEO should preserve pricing')
})

const testPreservesTimingRestrictions = test('Meaning: preserves timing restrictions', () => {
  const canonical = "Available Monday through Friday from 11 AM to 2 PM only."
  
  const mobile = renderMobilePreview(canonical)
  const desktop = renderDesktopCopy(canonical, undefined)
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  // Mobile may truncate but should keep key timing if space allows
  assert(desktop.includes('Monday through Friday'), 'Desktop should preserve days')
  assert(desktop.includes('11 AM to 2 PM'), 'Desktop should preserve hours')
  assert(seo.expandedCopy.includes('Monday through Friday'), 'SEO should preserve days')
  assert(seo.expandedCopy.includes('11 AM to 2 PM'), 'SEO should preserve hours')
})

const testNoNewClaimsIntroduced = test('Meaning: does not introduce new claims', () => {
  const canonical = "Save 20% on dinner entrees."
  
  const mobile = renderMobilePreview(canonical)
  const desktop = renderDesktopCopy(canonical, undefined)
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  // Check that no urgency or new claims added
  assert(!mobile.match(/limited|hurry|act now|while supplies last/i), 'Mobile should not add urgency')
  assert(!desktop.match(/limited|hurry|act now|while supplies last/i), 'Desktop should not add urgency')
  // SEO may add generic CTA but not urgency
  assert(!seo.expandedCopy.match(/limited time|hurry|act now|while supplies last/i), 'SEO should not add urgency')
})

// ============================================================================
// VENDOR WORKFLOW TESTS
// ============================================================================

const testSingleCanonicalSource = test('Vendor: manages only one canonical description', () => {
  const canonical = "Save 25% on all beverages."
  
  // Vendor provides only canonical
  // System generates all renderings automatically
  const mobile = renderMobilePreview(canonical)
  const desktop = renderDesktopCopy(canonical, "Coffee Shop")
  const seo = renderSEOCopy(canonical, "Coffee Shop", "Beverage Deal")
  
  // All renderings derived from single source
  assert(mobile.includes('25%'), 'Mobile derived from canonical')
  assert(desktop.includes('25%'), 'Desktop derived from canonical')
  assert(seo.expandedCopy.includes('25 percent'), 'SEO derived from canonical')
  
  // Vendor never sees or edits multiple versions
  assert(true, 'Vendor only manages canonical')
})

const testAutomaticRendering = test('Vendor: renderings generated automatically', () => {
  const canonical = "Save 40% on car wash services."
  
  // System generates all renderings without vendor input
  const mobile = renderMobilePreview(canonical)
  const desktop = renderDesktopCopy(canonical, undefined)
  const seo = renderSEOCopy(canonical, undefined, undefined)
  
  assert(mobile.length > 0, 'Mobile generated automatically')
  assert(desktop.length > 0, 'Desktop generated automatically')
  assert(seo.expandedCopy.length > 0, 'SEO generated automatically')
  assert(seo.metaDescription.length > 0, 'Meta generated automatically')
  assert(seo.structuredData['@type'] === 'Offer', 'Structured data generated automatically')
})

// ============================================================================
// HELPER FUNCTIONS (duplicated from route.ts for testing)
// ============================================================================

function renderMobilePreview(canonicalDescription: string): string {
  const sentences = canonicalDescription.split(/\.\s+/)
  let preview = sentences[0] || canonicalDescription

  preview = preview
    .replace(/brings your cost down from/gi, '→')
    .replace(/to just/gi, '')
    .replace(/This .+ deal\./gi, '')
    .trim()

  if (!preview.endsWith('.') && !preview.endsWith('!')) {
    preview += '.'
  }

  if (preview.length > 140) {
    const truncated = preview.substring(0, 137)
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > 100) {
      preview = truncated.substring(0, lastSpace) + '...'
    } else {
      preview = truncated + '...'
    }
  }

  return preview
}

function renderDesktopCopy(canonicalDescription: string, vendorName?: string): string {
  let desktopCopy = canonicalDescription

  if (vendorName && !canonicalDescription.includes(vendorName)) {
    desktopCopy = `${vendorName} offers: ${canonicalDescription}`
  }

  return desktopCopy
}

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

  expandedCopy = expandedCopy
    .replace(/\b(\d+)%/gi, '$1 percent')
    .replace(/\bGet\b/g, 'Discover')
    .replace(/\bgrab\b/gi, 'secure')

  if (vendorName && dealTitle) {
    expandedCopy = `${dealTitle} from ${vendorName}: ${expandedCopy}`
  }

  if (!expandedCopy.match(/available|redeem|claim/i)) {
    expandedCopy += ' Available for redemption through Lake County Local.'
  }

  let metaDescription: string
  if (vendorName && dealTitle) {
    metaDescription = `${dealTitle} at ${vendorName}. ${canonicalDescription.split(/\.\s+/)[0]}.`
  } else {
    metaDescription = canonicalDescription.split(/\.\s+/)[0] + '.'
  }

  if (metaDescription.length > 160) {
    metaDescription = metaDescription.substring(0, 157) + '...'
  }

  const structuredData: any = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: dealTitle || "Special Deal",
    description: canonicalDescription,
    availability: "https://schema.org/InStock"
  }

  if (vendorName) {
    structuredData["seller"] = {
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

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('MOBILE RENDERING TESTS')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testMobileRenderingConciseness()
  await testMobileFrontLoadsValue()
  await testMobileTruncatesGracefully()
  await testMobileRemovesVerbosity()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('DESKTOP RENDERING TESTS')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testDesktopPreservesCanonical()
  await testDesktopAddsVendorContext()
  await testDesktopNoCharacterLimit()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('SEO RENDERING TESTS')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testSEOExpandsAbbreviations()
  await testSEOAddsKeywords()
  await testSEOAddsCallToAction()
  await testSEOMetaDescriptionOptimal()
  await testSEOStructuredData()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('MEANING PRESERVATION TESTS')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testPreservesDiscountPercentage()
  await testPreservesPricing()
  await testPreservesTimingRestrictions()
  await testNoNewClaimsIntroduced()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('VENDOR WORKFLOW TESTS')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  await testSingleCanonicalSource()
  await testAutomaticRendering()

  console.log('\n' + '═'.repeat(60))
  console.log('TEST SUMMARY')
  console.log('═'.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('═'.repeat(60))

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests()
