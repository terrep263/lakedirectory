import { requireSuperAdminPage } from '@/lib/super-admin/page-guard'
import AdminAccessClient from './_components/AdminAccessClient'

export default async function SuperAdminCountyAdminsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSuperAdminPage()
  const { id } = await params
  return <AdminAccessClient countyId={id} />
}

