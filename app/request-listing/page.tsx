'use client'

import { useState } from 'react'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function RequestListingPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')

  // Simple honeypot (spam bots fill it; humans never see it)
  const [companyWebsite, setCompanyWebsite] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('submitting')

    try {
      const res = await fetch('/api/request-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          businessName,
          city,
          category,
          message,
          companyWebsite,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Request failed.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setError('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/header.jpg')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-white">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Request a listing
          </h1>
          <p className="mt-3 text-white/85">
            We curate directory members. Submit a request and our team will review it.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-lg bg-white shadow-md p-6 sm:p-8">
          {status === 'success' ? (
            <div>
              <h2 className="text-xl font-bold text-slate-900">Request received</h2>
              <p className="mt-2 text-slate-600">
                Thanks — we’ll review your submission and reach out if it’s a fit.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">Your information</h2>
              <p className="mt-2 text-slate-600">
                Tell us about the business you’d like to request.
              </p>

              <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4">
                <div className="hidden">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="companyWebsite">
                    Website
                  </label>
                  <input
                    id="companyWebsite"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900"
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="name">
                      Your name *
                    </label>
                    <input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="phone">
                      Phone
                    </label>
                    <input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(optional)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="businessName">
                      Business name *
                    </label>
                    <input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="city">
                      City
                    </label>
                    <input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(optional)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="category">
                      Category
                    </label>
                    <input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="message">
                    Notes
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Anything you want us to know (optional)"
                  />
                </div>

                {status === 'error' && error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {status === 'submitting' ? 'Submitting…' : 'Submit request'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <PublicFooter countyName="Lake County" state="Florida" />
    </div>
  )
}

