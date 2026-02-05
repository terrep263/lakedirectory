import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon | string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  } | string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  className,
}: StatCardProps) {
  const isEmojiIcon = typeof Icon === 'string';
  const isTrendObject = typeof trend === 'object' && trend !== null;

  return (
    <Card className={cn('shadow-soft border-0 card-hover', className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-heading font-bold text-foreground">
                {value}
              </p>
              {isTrendObject && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {typeof trend === 'string' && (
              <p className="text-sm text-lake-teal mt-2 font-medium">{trend}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-lake-blue/10 flex items-center justify-center shrink-0">
            {isEmojiIcon ? (
              <span className="text-2xl">{Icon}</span>
            ) : (
              <Icon className="h-6 w-6 text-lake-blue" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
