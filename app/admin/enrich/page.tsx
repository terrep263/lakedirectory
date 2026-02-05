'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EnrichListingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    enriched: number;
    skipped: number;
    errorCount?: number;
    eligibleCount?: number;
    totalChecked?: number;
    message?: string;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin-login');
          return;
        }

        const response = await fetch('/api/admin/businesses/enrich', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 403) {
          localStorage.removeItem('adminToken');
          router.push('/admin-login');
          return;
        }

        setAuthorized(true);
      } catch {
        setAuthorized(true);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleEnrich = async () => {
    console.log('[Enrich Page] Button clicked');
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('adminToken');
      console.log('[Enrich Page] Token:', token ? 'found' : 'missing');
      
      if (!token) {
        console.log('[Enrich Page] No token, redirecting');
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      console.log('[Enrich Page] Making API call');
      const response = await fetch('/api/admin/businesses/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[Enrich Page] API response status:', response.status);
      const data = await response.json();
      console.log('[Enrich Page] API response data:', data);

      if (response.status === 403) {
        console.log('[Enrich Page] Unauthorized (403), redirecting to login');
        localStorage.removeItem('adminToken');
        router.push('/admin-login');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('[Enrich Page] API returned error:', response.status, data);
        setError(data.error || `Failed to enrich listings (${response.status})`);
        setLoading(false);
        return;
      }

      console.log('[Enrich Page] Setting result:', data);
      setResult({
        processed: data.processed || 0,
        enriched: data.enriched || 0,
        skipped: data.skipped || 0,
        errorCount: data.errorCount || 0,
        eligibleCount: data.eligibleCount || 0,
        totalChecked: data.totalChecked || 0,
        message: data.message,
      });
      console.log('[Enrich Page] Result state updated');
    } catch (err) {
      console.error('[Enrich Page] Exception:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      console.log('[Enrich Page] Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {checkingAuth ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Verifying access...</p>
        </div>
      ) : !authorized ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-600">You do not have permission to access this page.</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enrich Listings</h1>
            <p className="text-gray-600">
              Automatically add photos and descriptions to Google-sourced business listings.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                This tool will scan all Google-sourced businesses and automatically add:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                <li>Business descriptions from Google Places editorial summaries</li>
                <li>Primary photos from Google Places listings</li>
                <li>Phone numbers from Google Places listings</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                Only empty fields will be filled. Existing vendor data will never be overwritten.
              </p>
            </div>

            <button
              onClick={handleEnrich}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Enriching... (please wait)' : '✨ Enrich All Listings'}
            </button>

            {loading && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">🔄 Processing businesses... This may take a moment.</p>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">❌ Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                <p className="text-sm font-semibold text-green-900 mb-4">✅ Enrichment Complete</p>
                
                {result.message && (
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-sm text-blue-800">
                    {result.message}
                  </div>
                )}

                {result.eligibleCount !== undefined && result.eligibleCount === 0 && (
                  <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                    ℹ️ Checked {result.totalChecked} Google-sourced businesses. None needed enrichment—all already have complete data.
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Total Checked</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{result.totalChecked}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Processed</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{result.processed}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Enriched</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{result.enriched}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Skipped</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{result.skipped}</p>
                  </div>
                </div>
                {result.errorCount ? (
                  <p className="text-xs text-red-600 mt-4">
                    ⚠️ {result.errorCount} business(es) encountered errors during enrichment.
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 mt-4">
                    All listings processed without errors.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
