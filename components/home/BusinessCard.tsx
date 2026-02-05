import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BusinessCardProps {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug?: string;
  city: string;
  citySlug?: string;
  imageUrl?: string | null;
  featured?: boolean;
  className?: string;
}

export function BusinessCard({
  slug,
  name,
  category,
  categorySlug,
  city,
  citySlug,
  imageUrl,
  featured = false,
  className,
}: BusinessCardProps) {
  return (
    <Card className={cn('overflow-hidden shadow-soft card-hover border-0 group', className)}>
      <div className="relative aspect-[16/10] bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lake-blue/10 to-lake-teal/10">
            <span className="text-4xl font-heading font-bold text-lake-blue/30">
              {name.charAt(0)}
            </span>
          </div>
        )}
        {featured && (
          <Badge className="absolute top-3 right-3 bg-lake-yellow text-gray-900 hover:bg-lake-yellow">
            Featured
          </Badge>
        )}
      </div>
      <CardContent className="pt-4">
        <Link href={`/business/${slug}`} className="block group-hover:text-lake-blue transition-colors">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-2 line-clamp-1">
            {name}
          </h3>
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {categorySlug ? (
            <Link
              href={`/businesses/category/${categorySlug}`}
              className="flex items-center gap-1 hover:text-lake-blue transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>{category}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              <span>{category}</span>
            </span>
          )}
          <span className="text-border">•</span>
          {citySlug ? (
            <Link
              href={`/businesses/city/${citySlug}`}
              className="flex items-center gap-1 hover:text-lake-blue transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>{city}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{city}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
