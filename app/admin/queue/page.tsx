import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/admin/page-guard'
import { DealStatus } from '@prisma/client'
import ClaimReviewActions from './_components/ClaimReviewActions'
import DealReviewActions from './_components/DealReviewActions'
import EscalationResolveActions from './_components/EscalationResolveActions'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminWorkQueuePage({ searchParams }: PageProps) {
  await requireAdminPage()
  const { tab } = await searchParams
  const activeTab = tab || 'overview'

  const [pendingClaims, draftDeals, openEscalations, failedImportJobs] = await Promise.all([
    prisma.businessClaim.count({ where: { status: 'PENDING' } }),
    prisma.deal.count({ where: { dealStatus: DealStatus.INACTIVE } }),
    prisma.adminEscalation.count({ where: { resolved: false } }),
    prisma.bulkImportJob.count({ where: { failedRecords: { gt: 0 } } }),
  ])

  const cards = [
    {
      title: 'Claims',
      count: pendingClaims,
      description: 'Review and approve/reject pending business claims.',
      href: '/admin/queue?tab=claims',
      icon: '🧑‍⚖️',
    },
    {
      title: 'Deals',
      count: draftDeals,
      description: 'Review draft deals and activate approved offers.',
      href: '/admin/queue?tab=deals',
      icon: '🧾',
    },
    {
      title: 'Escalations',
      count: openEscalations,
      description: 'Resolve AI escalations and admin review tasks.',
      href: '/admin/queue?tab=escalations',
      icon: '🚨',
    },
    {
      title: 'Import Issues',
      count: failedImportJobs,
      description: 'Review recent import jobs with failures.',
      href: '/admin/queue?tab=imports',
      icon: '📦',
    },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Queue</h1>
          <p className="text-gray-600 mt-1">Everything that needs admin attention, in one place</p>
        </div>
        <Link href="/admin/tools" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
          Tools →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-lg hover:border-blue-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600">{c.title}</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{c.count}</div>
                <div className="text-sm text-gray-600 mt-2">{c.description}</div>
              </div>
              <div className="text-3xl">{c.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'claims', label: `Claims (${pendingClaims})` },
            { id: 'deals', label: `Deals (${draftDeals})` },
            { id: 'escalations', label: `Escalations (${openEscalations})` },
            { id: 'imports', label: `Imports (${failedImportJobs})` },
          ].map((t) => (
            <Link
              key={t.id}
              href={t.id === 'overview' ? '/admin/queue' : `/admin/queue?tab=${t.id}`}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                activeTab === t.id
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </Link>
          ))}
          <div className="ml-auto flex gap-2">
            <Link className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50" href="/admin/businesses">
              Businesses
            </Link>
            <Link className="px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50" href="/admin/tools/voucher">
              Voucher Browser
            </Link>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="text-sm text-gray-700">
              Pick a tab to work through pending items. This page is the canonical starting point for admin operations.
            </div>
          )}

          {activeTab === 'claims' && (
            <ClaimsQueue />
          )}

          {activeTab === 'deals' && (
            <DealsQueue />
          )}

          {activeTab === 'escalations' && (
            <EscalationsQueue />
          )}

          {activeTab === 'imports' && (
            <ImportsQueue />
          )}
        </div>
      </div>
    </div>
  )
}

async function ClaimsQueue() {
  const claims = await prisma.businessClaim.findMany({
    where: { status: 'PENDING' },
    orderBy: { submittedAt: 'desc' },
    take: 50,
    include: {
      business: { select: { id: true, name: true } },
      applicant: { select: { id: true, email: true } },
    },
  })

  if (claims.length === 0) {
    return <p className="text-sm text-gray-600">No pending claims.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Business</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Applicant</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Submitted</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {claims.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link className="text-blue-700 hover:text-blue-900 font-medium" href={`/admin/businesses/manage/${c.businessId}`}>
                  {c.business.name}
                </Link>
                <div className="text-xs text-gray-500 font-mono">{c.businessId}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-gray-900">{c.applicant.email}</div>
                <div className="text-xs text-gray-500 font-mono">{c.applicantId}</div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">{c.submittedAt.toISOString()}</td>
              <td className="px-4 py-3">
                <ClaimReviewActions claimId={c.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function DealsQueue() {
  const deals = await prisma.deal.findMany({
    where: { dealStatus: DealStatus.INACTIVE },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      business: { select: { id: true, name: true, businessStatus: true } },
    },
  })

  if (deals.length === 0) {
    return <p className="text-sm text-gray-600">No deals awaiting review.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Deal</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Business</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {deals.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="text-gray-900 font-medium">{d.title}</div>
                <div className="text-xs text-gray-500 font-mono">{d.id}</div>
              </td>
              <td className="px-4 py-3">
                <Link className="text-blue-700 hover:text-blue-900 font-medium" href={`/admin/businesses/manage/${d.business.id}`}>
                  {d.business.name}
                </Link>
                <div className="text-xs text-gray-500">{d.business.businessStatus}</div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">{d.createdAt.toISOString()}</td>
              <td className="px-4 py-3">
                <DealReviewActions dealId={d.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

async function EscalationsQueue() {
  const escalations = await prisma.adminEscalation.findMany({
    where: { resolved: false },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })

  if (escalations.length === 0) {
    return <p className="text-sm text-gray-600">No open escalations.</p>
  }

  return (
    <div className="space-y-4">
      {escalations.map((e) => (
        <div key={e.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-gray-900">{e.escalationType} • {e.severity}</div>
              <div className="text-sm text-gray-700 mt-1">{e.description}</div>
              <div className="text-xs text-gray-500 mt-2 font-mono">{e.entityType}:{e.entityId}</div>
              <div className="text-xs text-gray-500 mt-1">{e.createdAt.toISOString()}</div>
            </div>
            <div className="shrink-0">
              <EscalationResolveActions escalationId={e.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

async function ImportsQueue() {
  const jobs = await prisma.bulkImportJob.findMany({
    where: { OR: [{ failedRecords: { gt: 0 } }, { flaggedRecords: { gt: 0 } }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      category: true,
      totalRecords: true,
      successfulRecords: true,
      failedRecords: true,
      flaggedRecords: true,
      createdAt: true,
      city: { select: { name: true } },
      county: { select: { name: true } },
    },
  })

  if (jobs.length === 0) {
    return <p className="text-sm text-gray-600">No import jobs with issues.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Job</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Location</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Failed</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Flagged</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {jobs.map((j) => (
            <tr key={j.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-gray-900">{j.id}</div>
                <div className="text-xs text-gray-600">{j.category}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{j.city.name}, {j.county.name}</td>
              <td className="px-4 py-3 text-gray-700">{j.status}</td>
              <td className="px-4 py-3 text-gray-900 font-semibold">{j.failedRecords}</td>
              <td className="px-4 py-3 text-gray-900 font-semibold">{j.flaggedRecords}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{j.createdAt.toISOString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

