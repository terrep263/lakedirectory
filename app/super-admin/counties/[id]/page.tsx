import { requireSuperAdminPage } from '@/lib/super-admin/page-guard'
import CountyDetailClient from './_components/CountyDetailClient'

export default async function SuperAdminCountyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSuperAdminPage()
  const { id } = await params
  return <CountyDetailClient countyId={id} />
}

