import * as React from 'react';
import Link from 'next/link';
import { Clock, Store } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DealCardProps {
  id: string;
  slug: string;
  title: string;
  businessName: string;
  businessSlug: string;
  price: number;
  originalValue: number;
  expiresAt?: string | null;
  className?: string;
}

export function DealCard({
  slug,
  title,
  businessName,
  businessSlug,
  price,
  originalValue,
  expiresAt,
  className,
}: DealCardProps) {
  const discount = Math.round(((originalValue - price) / originalValue) * 100);

  const formatExpiration = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expires today';
    if (diffDays === 1) return '1 day left';
    if (diffDays <= 7) return `${diffDays} days left`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={cn('overflow-hidden shadow-soft card-hover border-0 flex flex-col', className)}>
      <div className="bg-gradient-to-r from-lake-blue to-lake-teal p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0">
            {discount}% OFF
          </Badge>
          {expiresAt && (
            <span className="flex items-center gap-1 text-sm text-white/80">
              <Clock className="h-3.5 w-3.5" />
              {formatExpiration(expiresAt)}
            </span>
          )}
        </div>
        <h3 className="font-heading font-semibold text-lg line-clamp-2">
          {title}
        </h3>
      </div>
      <CardContent className="pt-4 flex-1">
        <Link
          href={`/business/${businessSlug}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-lake-blue transition-colors"
        >
          <Store className="h-4 w-4" />
          <span>{businessName}</span>
        </Link>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-heading font-bold text-lake-blue">
            ${price.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            ${originalValue.toFixed(2)} value
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full bg-lake-yellow hover:bg-lake-yellow-muted text-gray-900 font-semibold">
          <Link href={`/deal/${slug}`}>
            View Deal
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
