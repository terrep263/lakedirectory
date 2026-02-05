import { redirect } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/page-guard'

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  await requireAdminPage()
  redirect(`/admin/businesses/manage/${businessId}`)
}
