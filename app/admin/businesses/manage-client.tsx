'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Business {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  city: string;
  phone: string;
  aggregateRating: number | null;
  totalRatings: number | null;
  businessStatus: string;
  ingestionSource: string;
  externalPlaceId: string;
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
  businessPage: { id: string; isPublished: boolean; slug: string } | null;
}

export default function BusinessManagementClient() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(status && { status }),
        ...(city && { city }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/businesses/management?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setBusinesses(data.businesses);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCities(data.cities);
      setSelected(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      alert('Failed to fetch businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page, limit, status, city, search]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      setSelected(new Set(businesses.map(b => b.id)));
      setSelectAll(true);
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
    setSelectAll(false);
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) {
      alert('Please select at least one business');
      return;
    }

    const confirmMsg = {
      delete: `Delete ${selected.size} business(es)? This cannot be undone.`,
      activate: `Activate ${selected.size} business(es)?`,
      deactivate: `Deactivate ${selected.size} business(es)?`,
    }[action];

    if (!confirm(confirmMsg)) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/businesses/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({
          action,
          businessIds: Array.from(selected),
        }),
      });

      if (!response.ok) throw new Error('Failed to perform action');

      const data = await response.json();
      alert(`Success! Updated ${data.count} business(es)`);
      setSelected(new Set());
      setSelectAll(false);
      await fetchBusinesses();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by name, phone, or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-2"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">All Cities</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={limit.toString()}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">{selected.size} selected</h3>
              <p className="text-sm text-blue-700 mt-1">Choose an action below</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => bulkAction('activate')}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium"
              >
                Activate
              </button>
              <button
                onClick={() => bulkAction('deactivate')}
                disabled={actionLoading}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium"
              >
                Deactivate
              </button>
              <button
                onClick={() => bulkAction('delete')}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Businesses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {businesses.map(business => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(business.id)}
                        onChange={() => handleSelect(business.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {business.coverUrl && (
                          <Image
                            src={business.coverUrl}
                            alt={business.name}
                            width={40}
                            height={40}
                            className="rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            <a
                              href={`/business/${business.businessPage?.slug || business.slug || business.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {business.name}
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">{business.externalPlaceId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{business.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{business.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{business.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      {business.aggregateRating ? (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{business.aggregateRating.toFixed(1)}</span>
                          <span className="text-gray-500">({business.totalRatings})</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.businessStatus === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {business.businessStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {business.businessPage ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          business.businessPage.isPublished
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {business.businessPage.isPublished ? 'Published' : 'Draft'}
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`/admin/businesses/manage/${business.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {businesses.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
                {Math.min(page * limit, total)} of {total}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="inline-block px-4 py-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
