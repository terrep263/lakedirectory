import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HowItWorksStepProps {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function HowItWorksStep({
  step,
  icon: Icon,
  title,
  description,
  className,
}: HowItWorksStepProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-lake-blue/10 flex items-center justify-center">
          <Icon className="h-8 w-8 text-lake-blue" />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-lake-yellow flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{step}</span>
        </div>
      </div>
      <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  );
}
