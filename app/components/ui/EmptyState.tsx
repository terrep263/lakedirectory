import * as React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon | string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  const isEmojiIcon = typeof Icon === 'string';

  return (
    <Card className={cn('shadow-soft border-0', className)}>
      <CardContent className="py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-lake-blue/10 flex items-center justify-center mx-auto mb-6">
          {isEmojiIcon ? (
            <span className="text-4xl">{Icon}</span>
          ) : (
            <Icon className="h-10 w-10 text-lake-blue" />
          )}
        </div>
        <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
        {actionLabel && actionHref && (
          <Button
            asChild
            className="bg-lake-yellow hover:bg-lake-yellow-muted text-gray-900 font-semibold"
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
