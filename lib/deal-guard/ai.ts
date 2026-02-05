import OpenAI from 'openai'
import type { DealSubmission } from './types'

let _openai: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  if (_openai) return _openai
  _openai = new OpenAI({ apiKey: key })
  return _openai
}

export async function scoreQuality(deal: DealSubmission): Promise<{ score: number; feedback: string; raw?: unknown }> {
  if (!process.env.OPENAI_API_KEY) {
    return { score: 50, feedback: 'Scoring unavailable (OpenAI API key not configured)' }
  }

  const prompt = `Evaluate this marketplace deal (0-100) based on:
- Clarity: Easy to understand?
- Value: Good customer benefit?
- Price fairness: Transparent pricing?
- Trust: Feels legitimate?
- Redemption: Clear terms?

Deal:
Title: ${deal.title}
Description: ${deal.description}
Price: $${deal.price}
Category: ${deal.category}
Redemption: ${deal.redemptionTerms || 'Not specified'}

JSON response:
{
  "score": <0-100>,
  "feedback": "<brief explanation>"
}`

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || ''
    const parsed = JSON.parse(content || '{}') as { score?: unknown; feedback?: unknown }
    const score =
      typeof parsed.score === 'number'
        ? parsed.score
        : typeof parsed.score === 'string'
          ? Number(parsed.score)
          : 50

    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
      feedback: typeof parsed.feedback === 'string' && parsed.feedback.trim().length > 0 ? parsed.feedback : 'No feedback',
      raw: parsed,
    }
  } catch (e) {
    console.error('Deal Guard OpenAI scoring error:', e)
    return { score: 50, feedback: 'Scoring unavailable' }
  }
}

export async function generateRewrite(
  deal: DealSubmission,
  feedback: string
): Promise<{ title: string; description: string; valueStatement: string; raw?: unknown } | null> {
  if (!process.env.OPENAI_API_KEY) return null

  const prompt = `Rewrite this deal to improve clarity, value, and trust.

Current:
Title: ${deal.title}
Description: ${deal.description}
Price: $${deal.price}
Category: ${deal.category}

Issues: ${feedback}

Requirements:
- Title: Clear, benefit-focused (max 60 chars)
- Description: Detailed, honest, no urgency (100-300 words)
- Value: One sentence why this is a good deal

JSON:
{
  "title": "<rewritten>",
  "description": "<rewritten>",
  "valueStatement": "<value>"
}`

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || ''
    const parsed = JSON.parse(content || '{}') as {
      title?: unknown
      description?: unknown
      valueStatement?: unknown
    }

    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
    const valueStatement = typeof parsed.valueStatement === 'string' ? parsed.valueStatement.trim() : ''

    if (!title || !description || !valueStatement) return null
    return { title, description, valueStatement, raw: parsed }
  } catch (e) {
    console.error('Deal Guard OpenAI rewrite error:', e)
    return null
  }
}

