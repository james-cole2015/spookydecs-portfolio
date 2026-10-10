import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared frame for every graph node (#638): an SVG glyph in a shaped badge with the label
 * underneath. Handles are passed as children and sit INSIDE the badge, so connection lines
 * meet the glyph rather than the label text.
 */
export default function IconNodeShell({
  Icon,
  badgeClassName,
  iconSize,
  badgeSize,
  rounded = 'full',
  selected,
  label,
  sublabel,
  sublabelClassName = 'text-default-500',
  corner,
  width,
  children,
}: {
  Icon: LucideIcon;
  /** Border / fill / text colour classes for the badge. */
  badgeClassName: string;
  iconSize: number;
  badgeSize: number;
  rounded?: 'full' | 'xl';
  selected?: boolean;
  label: string;
  sublabel?: ReactNode;
  sublabelClassName?: string;
  /** Small count / status pip on the badge's top-right. */
  corner?: ReactNode;
  width: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center" style={{ width }}>
      <div
        className={`relative flex items-center justify-center border-2 ${
          rounded === 'full' ? 'rounded-full' : 'rounded-xl'
        } ${badgeClassName} ${selected ? 'ring-2 ring-secondary ring-offset-2 ring-offset-background' : ''}`}
        style={{ width: badgeSize, height: badgeSize }}
      >
        <Icon size={iconSize} strokeWidth={1.75} aria-hidden />
        {corner && (
          <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
            {corner}
          </span>
        )}
        {children}
      </div>
      <span className="w-full truncate text-xs font-medium text-foreground" title={label}>
        {label}
      </span>
      {sublabel && <span className={`w-full truncate text-[10px] ${sublabelClassName}`}>{sublabel}</span>}
    </div>
  );
}
