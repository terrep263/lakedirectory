import Link from 'next/link'
import { requireSuperAdminPage } from '@/lib/super-admin/page-guard'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSuperAdminPage()

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-600">
              Global operations (not county-scoped)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Console
                </p>
              </div>
              <nav className="p-2 space-y-1">
                <Link
                  href="/super-admin/counties"
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Counties
                </Link>
                <Link
                  href="/super-admin/launch"
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Launch Playbook
                </Link>
              </nav>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-900">Heads up</p>
              <p className="text-sm text-amber-800 mt-1">
                These pages require a <span className="font-mono">SUPER_ADMIN</span>{' '}
                identity and an active admin session cookie.
              </p>
            </div>
          </aside>

          <main className="lg:col-span-9">{children}</main>
        </div>
      </div>
    </div>
  )
}

