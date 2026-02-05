import { requireAdminPage } from '@/lib/admin/page-guard'
import AnalyticsClient from './viewer'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  await requireAdminPage()
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">County-scoped platform analytics and insights</p>
        </div>
        <a href="/admin/county" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
          Set County →
        </a>
      </div>
      <AnalyticsClient />
    </div>
  )
}

