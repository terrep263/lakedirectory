import React from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { RefreshJobStatus } from '@prisma/client'
import { requireAdminPage } from '@/lib/admin/page-guard'

export const dynamic = 'force-dynamic'

async function getJobs() {
  return prisma.refreshJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      mode: true,
      totalSelected: true,
      refreshedCount: true,
      updatedCount: true,
      unchangedCount: true,
      incompleteCount: true,
      verificationFailedCount: true,
      manualReviewCount: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  })
}

export default async function RefreshReportPage() {
  await requireAdminPage()
  const jobs = await getJobs()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Refresh Report</h1>
          <p className="text-sm text-gray-600">Google Places refresh jobs with verification outcomes</p>
        </div>
        <Link
          href="/admin/businesses"
          className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
        >
          Back to Businesses
        </Link>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Job ID</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Mode</th>
              <th className="px-3 py-2 text-left font-semibold">Selected</th>
              <th className="px-3 py-2 text-left font-semibold">Updated</th>
              <th className="px-3 py-2 text-left font-semibold">Incomplete</th>
              <th className="px-3 py-2 text-left font-semibold">Verification Failed</th>
              <th className="px-3 py-2 text-left font-semibold">Manual Review</th>
              <th className="px-3 py-2 text-left font-semibold">Started</th>
              <th className="px-3 py-2 text-left font-semibold">Finished</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{job.id}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass(job.status)}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-3 py-2">{job.mode}</td>
                <td className="px-3 py-2">{job.totalSelected}</td>
                <td className="px-3 py-2">{job.updatedCount}</td>
                <td className="px-3 py-2">{job.incompleteCount}</td>
                <td className="px-3 py-2">{job.verificationFailedCount}</td>
                <td className="px-3 py-2">{job.manualReviewCount}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{job.startedAt?.toISOString?.()}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{job.finishedAt?.toISOString?.()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function statusClass(status: RefreshJobStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-50 text-green-800 border border-green-200'
    case 'RUNNING':
      return 'bg-blue-50 text-blue-800 border border-blue-200'
    case 'FAILED':
      return 'bg-red-50 text-red-800 border border-red-200'
    default:
      return 'bg-gray-50 text-gray-800 border border-gray-200'
  }
}
