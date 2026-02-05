import { requireSuperAdminPage } from '@/lib/super-admin/page-guard'
import LaunchCountyClient from './_components/LaunchCountyClient'

export default async function SuperAdminLaunchCountyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSuperAdminPage()
  const { id } = await params
  return <LaunchCountyClient countyId={id} />
}

