import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function AdminToolsHomePage() {
  await requireAdminPage()

  const tools = [
    {
      href: '/admin/tools/assist',
      title: 'Admin Assist',
      description: 'Perform vendor/user actions on their behalf (audited).',
      icon: '🧑‍💼',
    },
    {
      href: '/admin/tools/voucher',
      title: 'Voucher Browser',
      description: 'Search vouchers, preview PDFs, and resend emails.',
      icon: '🎫',
    },
    {
      href: '/admin/tools/deal-guard',
      title: 'Deal Guard',
      description: 'Automated deal approval, rewrites, and price cap enforcement.',
      icon: '🛡️',
    },
    {
      href: '/admin/enrich',
      title: 'Enrich Listings',
      description: 'Run enrichment across eligible businesses (Google Places details).',
      icon: '✨',
    },
    {
      href: '/admin/tools/business-refresh',
      title: 'Business Refresh',
      description: 'Refresh businesses from Google Places and monitor jobs.',
      icon: '🔄',
    },
    {
      href: '/admin/share-metrics',
      title: 'Share Metrics',
      description: 'Track shares and rewards tied to social activity.',
      icon: '📣',
    },
    {
      href: '/admin/businesses/import',
      title: 'Import Businesses',
      description: 'Google Places import and bulk ingestion tools.',
      icon: '📥',
    },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tools</h1>
          <p className="text-gray-600 mt-1">Admin utilities and operational tooling</p>
        </div>
        <Link href="/admin/queue" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
          Back to Work Queue
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-lg hover:border-blue-300 transition"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{t.icon}</div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{t.title}</div>
                <div className="text-sm text-gray-600 mt-1">{t.description}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

