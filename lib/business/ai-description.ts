import OpenAI from 'openai';

let _openai: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  if (_openai) return _openai
  _openai = new OpenAI({ apiKey: key })
  return _openai
}

export interface BusinessInfoForDescription {
  name: string;
  category?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  aggregateRating?: number;
  totalRatings?: number;
}

/**
 * Generate an AI-powered business description using OpenAI GPT-4o-mini.
 * Used during import to auto-create BusinessPage descriptions.
 */
export async function generateBusinessDescription(
  businessInfo: BusinessInfoForDescription
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = buildDescriptionPrompt(businessInfo);
  const openai = getOpenAIClient()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 250,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated from OpenAI');
  }

  return content.trim();
}

function buildDescriptionPrompt(info: BusinessInfoForDescription): string {
  let details = `Business Name: ${info.name}`;
  
  if (info.category) {
    details += `\nCategory: ${info.category}`;
  }
  
  if (info.city || info.state) {
    const location = [info.city, info.state].filter(Boolean).join(', ');
    details += `\nLocation: ${location}`;
  }
  
  if (info.phone) {
    details += `\nPhone: ${info.phone}`;
  }
  
  if (info.website) {
    details += `\nWebsite: ${info.website}`;
  }
  
  if (info.aggregateRating) {
    details += `\nRating: ${info.aggregateRating}`;
  }
  
  if (info.totalRatings) {
    details += `\nTotal Ratings: ${info.totalRatings}`;
  }

  return `Generate a brief, engaging business description (2-3 sentences) for a Lake County Local business listing. Include what makes this business special and why locals should visit. Be friendly and welcoming.

${details}

Description:`;
}
