import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/admin/page-guard'
import EscalationResolveActions from '@/app/admin/queue/_components/EscalationResolveActions'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ resolved?: string }>
}

export default async function AdminEscalationsPage({ searchParams }: PageProps) {
  await requireAdminPage()
  const { resolved } = await searchParams
  const showResolved = resolved === 'true'

  const escalations = await prisma.adminEscalation.findMany({
    where: { resolved: showResolved },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escalations</h1>
          <p className="text-gray-600 mt-1">AI escalations and admin review tasks</p>
        </div>
        <div className="flex gap-2">
          <a
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              !showResolved ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            href="/admin/escalations"
          >
            Open
          </a>
          <a
            className={`px-3 py-2 rounded-lg text-sm font-medium border ${
              showResolved ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            href="/admin/escalations?resolved=true"
          >
            Resolved
          </a>
        </div>
      </div>

      {escalations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 text-sm text-gray-600">
          No {showResolved ? 'resolved' : 'open'} escalations.
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((e) => (
            <div key={e.id} className="bg-white rounded-lg border border-gray-200 shadow p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {e.escalationType} • {e.severity}
                  </div>
                  <div className="text-sm text-gray-700 mt-2">{e.description}</div>
                  <div className="text-xs text-gray-500 mt-3 font-mono">
                    {e.entityType}:{e.entityId}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Created: {e.createdAt.toISOString()}</div>
                  {e.resolvedAt && <div className="text-xs text-gray-500 mt-1">Resolved: {e.resolvedAt.toISOString()}</div>}
                  {e.resolution && <div className="text-sm text-gray-800 mt-3">Resolution: {e.resolution}</div>}
                </div>
                {!showResolved && (
                  <div className="shrink-0">
                    <EscalationResolveActions escalationId={e.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

