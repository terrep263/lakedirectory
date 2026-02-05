import { requireSuperAdminPage } from '@/lib/super-admin/page-guard'
import LaunchCountiesClient from './_components/LaunchCountiesClient'

export default async function SuperAdminLaunchCountiesPage() {
  await requireSuperAdminPage()
  return <LaunchCountiesClient />
}

