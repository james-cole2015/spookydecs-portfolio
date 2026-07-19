/**
 * Semantic chip color source + generic chip wrappers — the single fleet-wide
 * home for the design-system chip standard (design.md §5, audit finding F1).
 *
 * Before this module, `seasonChipColor`/`stateChipColor`/`priorityChipColor`/…
 * were re-implemented in 11 places across 9 subs, with season casing drift
 * (`Halloween` vs `halloween`). Everything here maps the canonical, capitalized
 * vocabulary to HeroUI semantic colors so a chip reads the same everywhere.
 *
 * Domain-specific dimensions (e.g. storage's Stored/Packed/Staged status) are
 * NOT hardcoded here — a sub passes its own `colorMap` (data, not a helper
 * function) to the generic `<StatusChip>`.
 */
import { Chip, type ChipProps } from '@heroui/react';

export type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

/** Season → color. Halloween=orange, Christmas=green, Shared/generic=violet. */
export function seasonChipColor(season?: string): ChipColor {
  switch (season) {
    case 'Halloween':
      return 'warning';
    case 'Christmas':
      return 'success';
    case 'Shared':
      return 'secondary';
    default:
      return 'default';
  }
}

/** Tracker/workflow state → color. */
export function stateChipColor(state?: string): ChipColor {
  switch (state) {
    case 'completed':
      return 'success';
    case 'open':
      return 'primary';
    case 'ready':
      return 'secondary';
    case 'blocked':
      return 'danger';
    case 'backlog':
    default:
      return 'default';
  }
}

/** Priority → color. */
export function priorityChipColor(priority?: string): ChipColor {
  switch (priority) {
    case 'P0':
      return 'danger';
    case 'P1':
      return 'warning';
    case 'P2':
    default:
      return 'default';
  }
}

/** Effort → color. */
export function effortChipColor(effort?: string): ChipColor {
  switch (effort) {
    case 'XL':
    case 'L':
      return 'warning';
    case 'M':
      return 'primary';
    case 'S':
    case 'XS':
    default:
      return 'default';
  }
}

/** AppHeader role pill → color (case-insensitive). */
export function roleChipColor(role?: string): ChipColor {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return 'warning';
    case 'builder':
      return 'secondary';
    case 'user':
    case 'viewer':
      return 'success';
    default:
      return 'default';
  }
}

interface StatusChipProps {
  /** The value to display and color. */
  value?: string;
  /** value → ChipColor map (canonical dimension or a sub-supplied domain map). */
  colorMap: Record<string, ChipColor>;
  /** Override the rendered text (defaults to `value`). */
  label?: string;
  /** Fallback text when `value` is empty (defaults to nothing rendered). */
  emptyLabel?: string;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
  className?: string;
}

/**
 * Generic status pill — routes a value through a color map so chips are
 * "correct-by-construction" (the conformance checker can verify usage
 * structurally rather than re-deriving the color at each call site).
 */
export function StatusChip({
  value,
  colorMap,
  label,
  emptyLabel,
  size = 'sm',
  variant = 'flat',
  className,
}: StatusChipProps) {
  const text = label ?? value ?? emptyLabel ?? '';
  const color = colorMap[value ?? ''] ?? 'default';
  return (
    <Chip size={size} variant={variant} color={color} className={className}>
      {text}
    </Chip>
  );
}

interface SeasonChipProps {
  value?: string;
  label?: string;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
  className?: string;
}

/** Convenience wrapper: a season pill bound to `seasonChipColor`. */
export function SeasonChip({ value, label, size = 'sm', variant = 'flat', className }: SeasonChipProps) {
  return (
    <Chip size={size} variant={variant} color={seasonChipColor(value)} className={className}>
      {label ?? value ?? '—'}
    </Chip>
  );
}
