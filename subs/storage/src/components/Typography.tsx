import type { ElementType, ReactNode } from 'react';

/**
 * Local Typography component mirroring HeroUI's type scale 1:1.
 * (The official <Typography> ships in HeroUI > 2.8, not in our installed 2.8.10,
 * so we replicate its scale — taken from @heroui/styles typography.css — to get
 * the same look without an upgrade.)
 */
export type TypographyType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body-sm' | 'body-xs' | 'code';

const SCALE: Record<TypographyType, string> = {
  h1: 'text-4xl font-semibold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
  h5: 'text-lg font-semibold tracking-tight',
  h6: 'text-base font-semibold tracking-tight',
  body: 'text-base leading-7',
  'body-sm': 'text-sm leading-6',
  'body-xs': 'text-xs leading-5',
  code: 'rounded-md bg-default px-1.5 py-0.5 font-mono text-sm text-foreground',
};

const DEFAULT_TAG: Record<TypographyType, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  'body-sm': 'p',
  'body-xs': 'p',
  code: 'code',
};

export function Typography({
  type = 'body',
  as,
  className = '',
  children,
}: {
  type?: TypographyType;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const Tag = as ?? DEFAULT_TAG[type];
  return <Tag className={`${SCALE[type]} ${className}`.trim()}>{children}</Tag>;
}
