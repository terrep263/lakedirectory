/**
 * MODULE 11: ANALYTICS & REPORTING
 * AI Insights for Analytics
 *
 * AI may summarize and highlight — never fabricate or infer beyond data.
 *
 * AI MAY:
 * - Summarize trends in plain language
 * - Highlight anomalies
 * - Explain metrics to non-technical users
 * - Suggest areas to investigate
 *
 * AI MAY NOT:
 * - Modify metrics
 * - Predict revenue as fact
 * - Rank businesses
 * - Override admin judgment
 *
 * THRESHOLDS:
 * - Low confidence → suppress narrative
 * - Conflicting signals → show raw metrics only
 */

import type {
  AIAnalyticsInsight,
  PlatformAnalyticsSummary,
  BusinessAnalytics,
  AISystemAnalytics,
  AdminOperationsAnalytics,
} from './types'

/**
 * Confidence thresholds for AI insights.
 */
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
}

/**
 * Minimum data points required for trend analysis.
 */
const MIN_DATA_POINTS = 5

/**
 * Generate insights for platform analytics.
 * Non-authoritative summaries and highlights.
 */
export function generatePlatformInsights(
  analytics: PlatformAnalyticsSummary
): AIAnalyticsInsight[] {
  const insights: AIAnalyticsInsight[] = []

  // Voucher redemption rate insight
  if (analytics.vouchers.issued >= MIN_DATA_POINTS) {
    const rate = analytics.vouchers.redemptionRate

    if (rate >= 70) {
      insights.push({
        type: 'trend',
        confidence: 'high',
        title: 'Strong Redemption Rate',
        description: `Voucher redemption rate of ${rate.toFixed(1)}% indicates high customer engagement.`,
        metric: 'redemptionRate',
        value: rate,
      })
    } else if (rate < 30) {
      insights.push({
        type: 'anomaly',
        confidence: 'medium',
        title: 'Low Redemption Rate',
        description: `Redemption rate of ${rate.toFixed(1)}% is below typical. Consider investigating deal visibility or terms.`,
        metric: 'redemptionRate',
        value: rate,
      })
    }
  }

  // Business growth insight
  if (analytics.growth.businessesChange !== 0) {
    const change = analytics.growth.businessesChange
    const direction = change > 0 ? 'increase' : 'decrease'
    const absChange = Math.abs(change)

    if (absChange >= 10) {
      insights.push({
        type: 'trend',
        confidence: absChange >= 20 ? 'high' : 'medium',
        title: `Business ${direction === 'increase' ? 'Growth' : 'Decline'}`,
        description: `${absChange.toFixed(1)}% ${direction} in business count compared to previous period.`,
        metric: 'businessesChange',
        value: change,
      })
    }
  }

  // Revenue insight
  if (analytics.revenue.gross > 0) {
    if (analytics.growth.revenueChange >= 20) {
      insights.push({
        type: 'trend',
        confidence: 'high',
        title: 'Revenue Growth',
        description: `Revenue increased by ${analytics.growth.revenueChange.toFixed(1)}% compared to previous period.`,
        metric: 'revenueChange',
        value: analytics.growth.revenueChange,
      })
    } else if (analytics.growth.revenueChange <= -20) {
      insights.push({
        type: 'anomaly',
        confidence: 'medium',
        title: 'Revenue Decline',
        description: `Revenue decreased by ${Math.abs(analytics.growth.revenueChange).toFixed(1)}%. May warrant investigation.`,
        metric: 'revenueChange',
        value: analytics.growth.revenueChange,
      })
    }
  }

  // Unclaimed businesses insight
  if (analytics.businesses.total > 0) {
    const unclaimedRate = (analytics.businesses.unclaimed / analytics.businesses.total) * 100
    if (unclaimedRate >= 50) {
      insights.push({
        type: 'suggestion',
        confidence: 'medium',
        title: 'Vendor Outreach Opportunity',
        description: `${unclaimedRate.toFixed(0)}% of businesses are unclaimed. Consider vendor recruitment efforts.`,
        metric: 'unclaimedRate',
        value: unclaimedRate,
      })
    }
  }

  // Overall summary (always include if we have data)
  if (analytics.businesses.total > 0 || analytics.vouchers.issued > 0) {
    insights.push({
      type: 'summary',
      confidence: 'high',
      title: 'Platform Overview',
      description: generatePlatformSummary(analytics),
    })
  }

  return insights
}

/**
 * Generate a plain-language platform summary.
 */
function generatePlatformSummary(analytics: PlatformAnalyticsSummary): string {
  const parts: string[] = []

  parts.push(`${analytics.businesses.active} active businesses`)

  if (analytics.deals.active > 0) {
    parts.push(`${analytics.deals.active} active deals`)
  }

  if (analytics.vouchers.issued > 0) {
    parts.push(`${analytics.vouchers.issued} vouchers issued`)
  }

  if (analytics.revenue.gross > 0) {
    parts.push(`$${analytics.revenue.gross.toLocaleString()} in gross revenue`)
  }

  return `This ${analytics.timeframe} period: ${parts.join(', ')}.`
}

/**
 * Generate insights for business analytics.
 */
export function generateBusinessInsights(
  analytics: BusinessAnalytics
): AIAnalyticsInsight[] {
  const insights: AIAnalyticsInsight[] = []

  // Redemption rate insight
  if (analytics.vouchers.purchased >= MIN_DATA_POINTS) {
    const rate = analytics.performance.redemptionRate

    if (rate >= 80) {
      insights.push({
        type: 'trend',
        confidence: 'high',
        title: 'Excellent Redemption',
        description: `${rate.toFixed(0)}% of purchased vouchers have been redeemed, indicating strong customer follow-through.`,
        metric: 'redemptionRate',
        value: rate,
      })
    } else if (rate < 40 && analytics.vouchers.purchased >= 10) {
      insights.push({
        type: 'suggestion',
        confidence: 'medium',
        title: 'Redemption Opportunity',
        description: `Consider sending reminders to customers with unredeemed vouchers.`,
        metric: 'redemptionRate',
        value: rate,
      })
    }
  }

  // Revenue insight
  if (analytics.revenue.gross > 0) {
    insights.push({
      type: 'summary',
      confidence: 'high',
      title: 'Revenue Summary',
      description: `Gross revenue of $${analytics.revenue.gross.toLocaleString()} with $${analytics.revenue.net.toLocaleString()} net after platform fees.`,
      metric: 'netRevenue',
      value: analytics.revenue.net,
    })
  }

  // Deal activity insight
  if (analytics.deals.total > 0) {
    const activeRate = (analytics.deals.active / analytics.deals.total) * 100
    if (activeRate < 50 && analytics.deals.total >= 3) {
      insights.push({
        type: 'suggestion',
        confidence: 'low',
        title: 'Deal Refresh',
        description: `Only ${analytics.deals.active} of ${analytics.deals.total} deals are active. Consider refreshing inactive deals.`,
        metric: 'activeDealRate',
        value: activeRate,
      })
    }
  }

  return insights
}

/**
 * Generate insights for AI system analytics.
 */
export function generateAISystemInsights(
  analytics: AISystemAnalytics
): AIAnalyticsInsight[] {
  const insights: AIAnalyticsInsight[] = []

  // Trust score distribution insight
  if (analytics.dealGuard.totalChecks >= MIN_DATA_POINTS) {
    const lowRate = (analytics.dealGuard.scoreDistribution.low / analytics.dealGuard.totalChecks) * 100

    if (lowRate >= 20) {
      insights.push({
        type: 'anomaly',
        confidence: 'medium',
        title: 'Low Trust Score Prevalence',
        description: `${lowRate.toFixed(0)}% of DealGuard checks resulted in low trust scores. Review flagged deals.`,
        metric: 'lowTrustRate',
        value: lowRate,
      })
    } else if (analytics.dealGuard.scoreDistribution.high > analytics.dealGuard.scoreDistribution.low * 3) {
      insights.push({
        type: 'trend',
        confidence: 'high',
        title: 'High Deal Quality',
        description: `Most deals are passing DealGuard checks with high trust scores.`,
        metric: 'highTrustRate',
        value: (analytics.dealGuard.scoreDistribution.high / analytics.dealGuard.totalChecks) * 100,
      })
    }
  }

  // Escalation backlog insight
  if (analytics.escalations.pending > 0) {
    if (analytics.escalations.pending >= 10) {
      insights.push({
        type: 'anomaly',
        confidence: 'high',
        title: 'Escalation Backlog',
        description: `${analytics.escalations.pending} escalations pending review. Prioritize resolution.`,
        metric: 'pendingEscalations',
        value: analytics.escalations.pending,
      })
    }
  }

  // Resolution time insight
  if (analytics.escalations.resolved >= MIN_DATA_POINTS) {
    const avgTime = analytics.escalations.averageResolutionTime

    if (avgTime <= 4) {
      insights.push({
        type: 'trend',
        confidence: 'high',
        title: 'Fast Resolution',
        description: `Average escalation resolution time of ${avgTime.toFixed(1)} hours is excellent.`,
        metric: 'avgResolutionTime',
        value: avgTime,
      })
    } else if (avgTime >= 48) {
      insights.push({
        type: 'suggestion',
        confidence: 'medium',
        title: 'Resolution Time',
        description: `Consider process improvements to reduce the ${avgTime.toFixed(0)}-hour average resolution time.`,
        metric: 'avgResolutionTime',
        value: avgTime,
      })
    }
  }

  return insights
}

/**
 * Generate insights for admin operations analytics.
 */
export function generateAdminOperationsInsights(
  analytics: AdminOperationsAnalytics
): AIAnalyticsInsight[] {
  const insights: AIAnalyticsInsight[] = []

  // SLA compliance insight
  if (analytics.escalations.resolved >= MIN_DATA_POINTS) {
    const compliance = analytics.response.slaCompliance

    if (compliance >= 95) {
      insights.push({
        type: 'trend',
        confidence: 'high',
        title: 'Excellent SLA Compliance',
        description: `${compliance.toFixed(0)}% of escalations resolved within SLA target.`,
        metric: 'slaCompliance',
        value: compliance,
      })
    } else if (compliance < 80) {
      insights.push({
        type: 'anomaly',
        confidence: 'medium',
        title: 'SLA Attention Needed',
        description: `SLA compliance at ${compliance.toFixed(0)}%. Review queue management.`,
        metric: 'slaCompliance',
        value: compliance,
      })
    }
  }

  // Oldest pending escalation insight
  if (analytics.escalations.oldestPending) {
    const hoursOld = (Date.now() - analytics.escalations.oldestPending.getTime()) / (1000 * 60 * 60)

    if (hoursOld >= 72) {
      insights.push({
        type: 'anomaly',
        confidence: 'high',
        title: 'Stale Escalation',
        description: `Oldest pending escalation is ${Math.floor(hoursOld / 24)} days old. Immediate attention recommended.`,
        metric: 'oldestPendingHours',
        value: hoursOld,
      })
    }
  }

  // Admin activity insight
  if (analytics.actions.total > 0) {
    insights.push({
      type: 'summary',
      confidence: 'high',
      title: 'Admin Activity',
      description: `${analytics.actions.total} admin actions by ${analytics.actions.uniqueAdmins} admin(s) this period.`,
      metric: 'totalActions',
      value: analytics.actions.total,
    })
  }

  return insights
}

/**
 * Filter insights by confidence level.
 * Low confidence insights are suppressed by default.
 */
export function filterInsightsByConfidence(
  insights: AIAnalyticsInsight[],
  minConfidence: 'high' | 'medium' | 'low' = 'medium'
): AIAnalyticsInsight[] {
  const confidenceOrder = ['low', 'medium', 'high']
  const minIndex = confidenceOrder.indexOf(minConfidence)

  return insights.filter(insight => {
    const insightIndex = confidenceOrder.indexOf(insight.confidence)
    return insightIndex >= minIndex
  })
}

/**
 * Check if insights have conflicting signals.
 * If conflicting, recommend showing raw metrics only.
 */
export function hasConflictingSignals(insights: AIAnalyticsInsight[]): boolean {
  // Check for both positive and negative trends on the same metric
  const metricSignals: Record<string, Set<string>> = {}

  for (const insight of insights) {
    if (!insight.metric) continue

    if (!metricSignals[insight.metric]) {
      metricSignals[insight.metric] = new Set()
    }

    if (insight.type === 'trend') {
      metricSignals[insight.metric].add('positive')
    } else if (insight.type === 'anomaly') {
      metricSignals[insight.metric].add('negative')
    }
  }

  // Check for any metric with both positive and negative signals
  return Object.values(metricSignals).some(signals =>
    signals.has('positive') && signals.has('negative')
  )
}
