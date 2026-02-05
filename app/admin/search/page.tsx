import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/admin/page-guard'

type PageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminSearchPage({ searchParams }: PageProps) {
  await requireAdminPage()
  const { q } = await searchParams
  const query = (q || '').trim()

  if (!query) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search</h1>
          <p className="text-gray-600 mt-1">Search businesses, deals, vouchers, accounts, and identities</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-700">Type in the search box in the header to begin.</p>
          <p className="text-sm text-gray-500 mt-2">Tip: you can paste IDs (businessId, dealId, voucherId) directly.</p>
        </div>
      </div>
    )
  }

  const [businesses, deals, vouchers, accounts, identities] = await Promise.all([
    prisma.business.findMany({
      where: { OR: [{ id: query }, { name: { contains: query, mode: 'insensitive' } }, { slug: query }] },
      take: 10,
      select: { id: true, name: true, slug: true, businessStatus: true },
    }),
    prisma.deal.findMany({
      where: { OR: [{ id: query }, { title: { contains: query, mode: 'insensitive' } }] },
      take: 10,
      select: { id: true, title: true, dealStatus: true, business: { select: { id: true, name: true } } },
    }),
    prisma.voucher.findMany({
      where: { OR: [{ id: query }, { qrToken: query }] },
      take: 10,
      select: { id: true, status: true, deal: { select: { id: true, title: true } }, business: { select: { id: true, name: true } } },
    }),
    prisma.account.findMany({
      where: { OR: [{ id: query }, { email: { contains: query, mode: 'insensitive' } }] },
      take: 10,
      select: { id: true, email: true, role: true },
    }),
    prisma.userIdentity.findMany({
      where: { OR: [{ id: query }, { email: { contains: query, mode: 'insensitive' } }] },
      take: 10,
      select: { id: true, email: true, role: true, status: true },
    }),
  ])

  const section = (title: string, children: React.ReactNode) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search</h1>
          <p className="text-gray-600 mt-1">
            Results for <span className="font-mono text-gray-900">{query}</span>
          </p>
        </div>
        <Link href="/admin/queue" className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
          Back to Work Queue
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {section(
          'Businesses',
          businesses.length ? (
            <div className="space-y-2">
              {businesses.map((b) => (
                <Link key={b.id} href={`/admin/businesses/manage/${b.id}`} className="block p-3 rounded hover:bg-gray-50">
                  <div className="font-semibold text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-600 font-mono">{b.id}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No businesses found.</p>
          )
        )}

        {section(
          'Deals',
          deals.length ? (
            <div className="space-y-2">
              {deals.map((d) => (
                <Link key={d.id} href={`/admin/queue?tab=deals&dealId=${d.id}`} className="block p-3 rounded hover:bg-gray-50">
                  <div className="font-semibold text-gray-900">{d.title}</div>
                  <div className="text-xs text-gray-600">{d.business.name}</div>
                  <div className="text-xs text-gray-600 font-mono">{d.id}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No deals found.</p>
          )
        )}

        {section(
          'Vouchers',
          vouchers.length ? (
            <div className="space-y-2">
              {vouchers.map((v) => (
                <Link key={v.id} href={`/admin/tools/voucher?voucherId=${v.id}`} className="block p-3 rounded hover:bg-gray-50">
                  <div className="font-semibold text-gray-900">{v.id}</div>
                  <div className="text-xs text-gray-600">{v.business.name} • {v.deal.title}</div>
                  <div className="text-xs text-gray-600">{v.status}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No vouchers found.</p>
          )
        )}

        {section(
          'Accounts & Identities',
          <div className="space-y-6">
            <div>
              <div className="font-semibold text-gray-900 mb-2">Accounts</div>
              {accounts.length ? (
                <div className="space-y-2">
                  {accounts.map((a) => (
                    <div key={a.id} className="p-3 rounded bg-gray-50">
                      <div className="text-sm font-medium text-gray-900">{a.email}</div>
                      <div className="text-xs text-gray-600">{a.role}</div>
                      <div className="text-xs text-gray-600 font-mono">{a.id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No accounts found.</p>
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-2">UserIdentity</div>
              {identities.length ? (
                <div className="space-y-2">
                  {identities.map((u) => (
                    <div key={u.id} className="p-3 rounded bg-gray-50">
                      <div className="text-sm font-medium text-gray-900">{u.email}</div>
                      <div className="text-xs text-gray-600">{u.role} • {u.status}</div>
                      <div className="text-xs text-gray-600 font-mono">{u.id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No identities found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

