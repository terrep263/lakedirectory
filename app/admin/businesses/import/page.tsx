import { GoogleImportTool } from '../google-import-tool'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function ImportBusinessesPage() {
  await requireAdminPage()
  const recentImports = await prisma.businessImportLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 25,
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      location: true,
      category: true,
      createdCount: true,
      skippedCount: true,
      errorMessage: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Businesses</h1>
        <p className="text-gray-600 mt-1">Import businesses from Google Places</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <GoogleImportTool />
      </div>

      {/* Recent Import History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Import Runs</h2>
          <p className="text-sm text-gray-600 mt-1">Last 25 import operations</p>
        </div>
        {recentImports.length === 0 ? (
          <div className="p-8 text-center text-gray-600 text-sm">
            No import history yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Timestamp</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">City</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Created</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Skipped</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentImports.map((log, idx) => {
                  const location = log.location as any
                  const city = location?.city || '—'
                  const isComplete = !!log.completedAt
                  const hasError = !!log.errorMessage
                  const statusColor = hasError ? 'bg-red-100 text-red-800' : isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  const statusText = hasError ? 'Error' : isComplete ? 'Complete' : 'In Progress'

                  return (
                    <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(log.startedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">{city}</td>
                      <td className="px-6 py-4 text-gray-700">{log.category || '—'}</td>
                      <td className="px-6 py-4 text-gray-900 font-semibold">{log.createdCount}</td>
                      <td className="px-6 py-4 text-gray-600">{log.skippedCount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
