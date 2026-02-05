import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TrustCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function TrustCard({ icon: Icon, title, description, className }: TrustCardProps) {
  return (
    <Card className={cn('shadow-soft card-hover border-0', className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-lake-blue/10 flex items-center justify-center mb-4">
            <Icon className="h-7 w-7 text-lake-blue" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
