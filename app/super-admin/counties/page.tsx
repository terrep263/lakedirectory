import { requireSuperAdminPage } from '@/lib/super-admin/page-guard'
import CountiesClient from './_components/CountiesClient'

export default async function SuperAdminCountiesPage() {
  await requireSuperAdminPage()
  return <CountiesClient />
}

