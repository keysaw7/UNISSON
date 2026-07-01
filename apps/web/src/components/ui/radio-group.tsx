'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />);
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-muted data-[state=checked]:border-primary data-[state=checked]:bg-primary/5',
      className,
    )}
    {...props}
  >
    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border">
      <RadioGroupPrimitive.Indicator className="h-2 w-2 rounded-full bg-primary" />
    </span>
    {children}
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';
