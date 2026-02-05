import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/admin/page-guard'
import ClaimReviewActions from '@/app/admin/queue/_components/ClaimReviewActions'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminClaimsPage({ searchParams }: PageProps) {
  await requireAdminPage()
  const { status } = await searchParams
  const filter = (status || 'PENDING').toUpperCase()

  const where =
    filter === 'APPROVED' || filter === 'REJECTED' || filter === 'PENDING'
      ? { status: filter as 'PENDING' | 'APPROVED' | 'REJECTED' }
      : { status: 'PENDING' as const }

  const claims = await prisma.businessClaim.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: 200,
    include: {
      business: { select: { id: true, name: true } },
      applicant: { select: { id: true, email: true, role: true } },
      reviewer: { select: { id: true, email: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims</h1>
          <p className="text-gray-600 mt-1">Review business claim requests and bind vendor ownership</p>
        </div>
        <Link href="/admin/queue?tab=claims" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
          Back to Queue
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <Link
            key={s}
            href={`/admin/vendors/claims?status=${s}`}
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              filter === s ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Business</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Applicant</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Submitted</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Reviewed</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {claims.map((c, idx) => (
                <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                  <td className="px-6 py-4">
                    <Link className="text-blue-700 hover:text-blue-900 font-medium" href={`/admin/businesses/manage/${c.businessId}`}>
                      {c.business.name}
                    </Link>
                    <div className="text-xs text-gray-500 font-mono">{c.businessId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{c.applicant.email}</div>
                    <div className="text-xs text-gray-500">{c.applicant.role}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{c.status}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">{c.submittedAt.toISOString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {c.reviewedAt ? c.reviewedAt.toISOString() : '—'}
                    <div className="text-xs text-gray-500">{c.reviewer?.email || ''}</div>
                    {c.rejectionReason && <div className="text-xs text-red-700 mt-1">{c.rejectionReason}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {c.status === 'PENDING' ? <ClaimReviewActions claimId={c.id} /> : <span className="text-xs text-gray-500">—</span>}
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-600" colSpan={6}>
                    No claims found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

