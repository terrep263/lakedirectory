import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon | string;
  href: string;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}

export default function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  disabled = false,
  disabledReason,
  className,
}: ActionCardProps) {
  const isEmojiIcon = typeof Icon === 'string';

  const cardContent = (
    <Card
      className={cn(
        'shadow-soft border-0 h-full flex flex-col',
        !disabled && 'card-hover cursor-pointer',
        disabled && 'opacity-60',
        className
      )}
    >
      <CardContent className="pt-6 flex-1">
        <div className="w-14 h-14 rounded-xl bg-lake-blue/10 flex items-center justify-center mb-4">
          {isEmojiIcon ? (
            <span className="text-3xl">{Icon}</span>
          ) : (
            <Icon className="h-7 w-7 text-lake-blue" />
          )}
        </div>
        <h3 className="font-heading text-xl font-bold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </CardContent>
      <CardFooter className="pt-0">
        {disabled && disabledReason ? (
          <div className="w-full px-4 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm text-center">
            {disabledReason}
          </div>
        ) : (
          <Button className="w-full bg-lake-blue hover:bg-lake-blue-dark text-white">
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  if (disabled) {
    return cardContent;
  }

  return <Link href={href} className="block h-full">{cardContent}</Link>;
}
