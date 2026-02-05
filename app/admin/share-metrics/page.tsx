import { OverallShareMetrics } from '@/components/admin/OverallShareMetrics'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function AdminShareMetricsPage() {
  await requireAdminPage()
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Share Metrics</h1>
          <p className="text-gray-600 mt-1">
            Track social media shares and user engagement across all platforms
          </p>
        </div>
        <Link
          href="/admin/queue"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Back to Work Queue
        </Link>
      </div>

      {/* Overall Metrics Component */}
      <OverallShareMetrics />
    </div>
  )
}
