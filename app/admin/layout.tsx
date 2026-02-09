'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') return true;
    if (href !== '/admin' && pathname.startsWith(href)) return true;
    return false;
  };

  const navGroups = useMemo(() => {
    return [
      {
        heading: 'Work',
        items: [
          { href: '/admin/queue', label: 'Work Queue', icon: '🗂️' },
          { href: '/admin/search', label: 'Search', icon: '🔎' },
        ],
      },
      {
        heading: 'Operations',
        items: [
          { href: '/admin/businesses', label: 'Businesses', icon: '🏢' },
          { href: '/admin/deals', label: 'Deals', icon: '🎁' },
          { href: '/admin/vendors', label: 'Vendors', icon: '🏪' },
          { href: '/admin/vendors/claims', label: 'Claims', icon: '🧑‍⚖️' },
          { href: '/admin/users', label: 'Users', icon: '👥' },
        ],
      },
      {
        heading: 'Governance',
        items: [
          { href: '/admin/county', label: 'County Context', icon: '🗺️' },
          { href: '/admin/cities', label: 'Cities', icon: '🏙️' },
          { href: '/admin/featured', label: 'Featured', icon: '⭐' },
          { href: '/admin/blog', label: 'Blog', icon: '📝' },
          { href: '/admin/founders', label: 'Founders', icon: '🏅' },
        ],
      },
      {
        heading: 'Observability',
        items: [
          { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
          { href: '/admin/escalations', label: 'Escalations', icon: '🚨' },
          { href: '/admin/audit', label: 'Audit Log', icon: '🧾' },
          { href: '/admin/share-metrics', label: 'Share Metrics', icon: '📣' },
        ],
      },
      {
        heading: 'Tools',
        items: [
          { href: '/admin/tools', label: 'Tools Home', icon: '🧰' },
          { href: '/admin/tools/assist', label: 'Admin Assist', icon: '🧑‍💼' },
          { href: '/admin/tools/voucher', label: 'Voucher Browser', icon: '🎫' },
          { href: '/admin/tools/deal-guard', label: 'Deal Guard', icon: '🛡️' },
          { href: '/admin/enrich', label: 'Enrich Listings', icon: '✨' },
          { href: '/admin/tools/business-refresh', label: 'Business Refresh', icon: '🔄' },
          { href: '/admin/businesses/import', label: 'Import', icon: '📥' },
        ],
      },
      {
        heading: 'Super Admin',
        items: [{ href: '/super-admin', label: 'Super Admin', icon: '🛡️' }],
      },
      {
        heading: 'System',
        items: [{ href: '/admin/settings', label: 'Settings', icon: '⚙️' }],
      },
    ] as const;
  }, []);

  const currentTitle = useMemo(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href) return item.label;
        if (pathname.startsWith(item.href + '/')) return item.label;
      }
    }
    if (pathname.startsWith('/admin/businesses')) return 'Businesses';
    return 'Admin';
  }, [navGroups, pathname]);

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-72 bg-slate-900 text-white flex flex-col fixed left-0 top-0 bottom-0 overflow-y-auto">
        <div className="px-6 py-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-xs text-slate-400 mt-1">Control Center</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {/* Public Site Link */}
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-md mb-4"
          >
            <span className="text-lg">🌐</span>
            <span>View Public Site</span>
            <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>

          {navGroups.map((group) => (
            <div key={group.heading}>
              <div className="px-3 py-4 mt-2 mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.heading}</p>
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-2">Logged in as</p>
            <p className="text-sm font-semibold text-white">Administrator</p>
            <p className="text-xs text-slate-400 mt-1">admin@lakedirectory.com</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-72 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-gray-900">{currentTitle}</h2>
            <Link 
              href="/" 
              target="_blank"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Site
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                if (!q) return;
                router.push(`/admin/search?q=${encodeURIComponent(q)}`);
              }}
              className="hidden md:block"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search businesses, deals, vouchers…"
                className="w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
            <div className="relative group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold cursor-pointer">A</div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin-login';
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
