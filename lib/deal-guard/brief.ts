import OpenAI from 'openai'

export type DealBriefParse = {
  item: string
  quantity: number
  dealPrice: number
  regularPrice: number
}

export type SeoDealDraft = {
  title: string
  description: string
  terms: string
  dealCategory: string
  originalValue: number
  dealPrice: number
}

let _openai: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  if (_openai) return _openai
  _openai = new OpenAI({ apiKey: key })
  return _openai
}

const DISALLOWED_PATTERNS: RegExp[] = [
  /\bbogo\b/i,
  /\bbuy\s*one\s*get\s*one\b/i,
  /%/,
  /\bpercent\b/i,
  /\boff\b/i,
  /\bfree\b/i,
]

export function validateBriefText(brief: string): string | null {
  const b = brief.trim()
  if (b.length < 10) return 'Brief is too short'
  if (DISALLOWED_PATTERNS.some((p) => p.test(b))) {
    return 'This marketplace only supports transparent “X for $Y, regular $Z” deals (no BOGO / % off / free offers).'
  }
  return null
}

export function parseTransparentDealBrief(brief: string): DealBriefParse {
  const violation = validateBriefText(brief)
  if (violation) throw new Error(violation)

  const text = brief
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim()

  // Extract quantity + item + dealPrice
  // Examples supported:
  // - "3 tacos for $3, regular $9"
  // - "I want to sell 3 tacos for $3, the regular price is $9."
  const main = text.match(
    /(\d+)\s+(.+?)\s+for\s+\$?\s*(\d+(?:\.\d{1,2})?)/i
  )
  const regular = text.match(
    /(regular(?:\s+price)?\s*(?:is|:)?|normally|reg\.?)\s+\$?\s*(\d+(?:\.\d{1,2})?)/i
  )

  const quantity = main ? Number(main[1]) : NaN
  const itemRaw = main ? String(main[2] || '').trim() : ''
  const dealPrice = main ? Number(main[3]) : NaN
  const regularPrice = regular ? Number(regular[2] ?? regular[1]) : NaN

  const cleanedItem = itemRaw
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\s+(each|ea\.?)$/i, '')
    .trim()

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Brief must include a quantity (example: “3 tacos for $3, regular $9.”)')
  }
  if (!cleanedItem || cleanedItem.length < 2) {
    throw new Error('Brief must include what is being sold (example: “3 tacos for $3, regular $9.”)')
  }
  if (!Number.isFinite(dealPrice) || dealPrice <= 0) {
    throw new Error('Brief must include a deal price (example: “3 tacos for $3, regular $9.”)')
  }
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
    throw new Error('Brief must include a regular price (example: “3 tacos for $3, regular $9.”)')
  }
  if (dealPrice >= regularPrice) {
    throw new Error('Deal price must be less than the regular price.')
  }

  return {
    item: cleanedItem,
    quantity,
    dealPrice,
    regularPrice,
  }
}

export async function generateSeoDealFromBrief(params: {
  brief: string
  businessName: string
  businessCity?: string | null
  businessState?: string | null
  dealCategory: string
  feedback?: string
}): Promise<{ draft: SeoDealDraft; parsed: DealBriefParse; raw?: unknown }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  // Deterministic parsing (locks numbers so AI can't drift)
  const locked = parseTransparentDealBrief(params.brief)

  const prompt = `You are Deal Guard for a local directory marketplace.

RULES (hard):
- You MUST use these exact values (do not change numbers or item wording):
  - quantity: ${locked.quantity}
  - item: ${locked.item}
  - dealPrice: ${locked.dealPrice}
  - regularPrice: ${locked.regularPrice}
- The transparent pricing sentence must appear EXACTLY once in the description:
  "${locked.quantity} ${locked.item} for $${locked.dealPrice}, regular $${locked.regularPrice}"
- Do NOT output BOGO, % off, "free", "up to", ranges, or vague pricing.
- Keep it honest, clear, and easy to buy.
- SEO optimized: include the business name and location naturally, and include the item keyword.
- Title must be <= 70 characters.
- Description must be 120-220 words.
- Include short, clear redemption terms (2-5 bullets) with no urgency language.

Business:
- Name: ${params.businessName}
- Location: ${(params.businessCity || '').trim()}${params.businessState ? `, ${params.businessState}` : ''}
- Category: ${params.dealCategory}

Vendor brief:
${params.brief}

If prior feedback is provided, fix the issues and regenerate:
${params.feedback ? params.feedback : 'None'}

Return JSON only with this shape:
{
  "parsed": { "item": string, "quantity": number, "dealPrice": number, "regularPrice": number },
  "draft": {
    "title": string,
    "description": string,
    "terms": string,
    "dealCategory": string,
    "originalValue": number,
    "dealPrice": number
  }
}`

  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content || ''
  const parsed = JSON.parse(content || '{}') as { parsed?: any; draft?: any }

  const p = parsed.parsed || {}
  const d = parsed.draft || {}

  // Parsed values from model are advisory only; we use locked deterministic parse.
  const quantity = locked.quantity
  const dealPrice = locked.dealPrice
  const regularPrice = locked.regularPrice
  const item = locked.item

  const title = typeof d.title === 'string' ? d.title.trim() : ''
  const description = typeof d.description === 'string' ? d.description.trim() : ''
  const terms = typeof d.terms === 'string' ? d.terms.trim() : ''
  const dealCategory = typeof d.dealCategory === 'string' ? d.dealCategory.trim() : params.dealCategory

  if (!title || !description || !terms) {
    throw new Error('Failed to generate SEO deal draft')
  }

  // Hard enforce no disallowed styles in generated output
  const combined = `${title}\n${description}\n${terms}`
  const violation = validateBriefText(combined)
  if (violation) throw new Error(violation)

  const expectedSentence = `${quantity} ${item} for $${dealPrice}, regular $${regularPrice}`
  if (!combined.toLowerCase().includes(expectedSentence.toLowerCase())) {
    throw new Error('Generated draft must explicitly contain the transparent pricing statement')
  }

  return {
    parsed: { item, quantity, dealPrice, regularPrice },
    draft: {
      title,
      description,
      terms,
      dealCategory,
      originalValue: regularPrice,
      dealPrice,
    },
    raw: { ...parsed, locked },
  }
}

