import { requireAdminPage } from '@/lib/admin/page-guard'
import AuditLogClient from './viewer'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  await requireAdminPage()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600 mt-1">All admin actions are explicit and auditable.</p>
      </div>
      <AuditLogClient />
    </div>
  )
}

