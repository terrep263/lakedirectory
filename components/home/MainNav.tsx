'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  children?: Array<{ label: string; href: string; description?: string }>;
}

const navItems: NavItem[] = [
  {
    label: 'Businesses',
    children: [
      { label: 'All Businesses', href: '/businesses', description: 'Browse all local businesses' },
      { label: 'By Category', href: '/businesses/category', description: 'Find businesses by type' },
      { label: 'By City', href: '/businesses/city', description: 'Explore businesses near you' },
    ],
  },
  { label: 'Deals', href: '/deals' },
  { label: 'How It Works', href: '/about' },
];

interface MainNavProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function MainNav({ variant = 'dark', className }: MainNavProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const textColor = variant === 'dark' ? 'text-white' : 'text-foreground';
  const textMuted = variant === 'dark' ? 'text-white/80' : 'text-muted-foreground';
  const hoverBg = variant === 'dark' ? 'hover:bg-white/10' : 'hover:bg-accent';

  return (
    <nav className={cn('flex items-center justify-between', className)}>
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <span className={cn('text-2xl font-heading font-bold', textColor)}>
          Lake County Local
        </span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-2">
        <NavigationMenu>
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.label}>
                {item.children ? (
                  <>
                    <NavigationMenuTrigger
                      className={cn(
                        'bg-transparent',
                        textColor,
                        hoverBg,
                        'data-[state=open]:bg-white/10'
                      )}
                    >
                      {item.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={child.href}
                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              >
                                <div className="text-sm font-medium leading-none">
                                  {child.label}
                                </div>
                                {child.description && (
                                  <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                    {child.description}
                                  </p>
                                )}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href!}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'bg-transparent',
                        textColor,
                        hoverBg
                      )}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            asChild
            className={cn(textColor, hoverBg)}
          >
            <Link href="/login">Vendor Login</Link>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className={textColor}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[350px]">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col gap-6 mt-8">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <div className="pl-4 space-y-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    className="block text-sm font-semibold text-foreground hover:text-lake-blue transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-4 border-t">
              <Button
                asChild
                className="w-full bg-lake-blue hover:bg-lake-blue-dark"
              >
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Vendor Login
                </Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
