import type { DealGuardStatus } from '@prisma/client'

export type DealGuardDecision =
  | 'approved'
  | 'rejected'
  | 'rewrite_required'
  | 'suspended'

export type DealGuardResult = {
  status: DealGuardDecision
  guardStatus: DealGuardStatus
  qualityScore: number
  feedback: string
  violations: string[]
  aiRewrite?: {
    title: string
    description: string
    valueStatement: string
  }
  aiRaw?: unknown
}

export type DealSubmission = {
  title: string
  description: string
  price: number
  category: string
  redemptionTerms?: string
  expirationDate?: string
  voucherLimit?: number
}

