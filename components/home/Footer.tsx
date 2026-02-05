import * as React from 'react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn('bg-slate-900 text-slate-300', className)}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="block mb-4">
              <span className="text-xl font-heading font-bold text-white">
                Lake County Local
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your trusted local directory for discovering businesses and deals in Lake County.
            </p>
          </div>

          {/* Discover */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">Discover</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/businesses" className="text-sm hover:text-white transition-colors">
                  All Businesses
                </Link>
              </li>
              <li>
                <Link href="/businesses/category" className="text-sm hover:text-white transition-colors">
                  Browse Categories
                </Link>
              </li>
              <li>
                <Link href="/businesses/city" className="text-sm hover:text-white transition-colors">
                  Browse Cities
                </Link>
              </li>
              <li>
                <Link href="/deals" className="text-sm hover:text-white transition-colors">
                  Current Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">For Business</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-sm hover:text-white transition-colors">
                  Vendor Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm hover:text-white transition-colors">
                  Claim Your Business
                </Link>
              </li>
              <li>
                <Link href="/about/vendors" className="text-sm hover:text-white transition-colors">
                  Why List With Us
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">About</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-slate-700" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {currentYear} Lake County Local. Supporting local businesses in Lake County.</p>
          <p className="text-slate-500">
            Made with care for our local community
          </p>
        </div>
      </div>
    </footer>
  );
}
