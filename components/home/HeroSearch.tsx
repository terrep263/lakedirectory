'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface HeroSearchProps {
  cities?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  className?: string;
}

export function HeroSearch({ cities = [], categories = [], className }: HeroSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [city, setCity] = React.useState('');
  const [category, setCategory] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    router.push(`/businesses?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className={cn(
        'flex flex-col md:flex-row gap-3 w-full max-w-4xl mx-auto',
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search businesses or keywords..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 rounded-xl bg-white border-0 shadow-soft text-base"
        />
      </div>

      <div className="flex gap-3">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[180px] h-12 rounded-xl bg-white border-0 shadow-soft">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-12 rounded-xl bg-white border-0 shadow-soft">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          size="lg"
          className="h-12 px-8 rounded-xl bg-lake-yellow hover:bg-lake-yellow-muted text-gray-900 font-semibold shadow-soft"
        >
          Search
        </Button>
      </div>
    </form>
  );
}
