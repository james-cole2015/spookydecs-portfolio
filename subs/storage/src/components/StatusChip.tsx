import { Chip } from '@heroui/react';
import { storageStatusColor } from '../config/storageConfig';

/**
 * Granular storage-status pill — shows the real unit status
 * (Empty / Partial / Packed / Stored / Staged / Out of Service), colored via
 * the shared `storageStatusColor` map so it reads the same on card, list, and
 * detail views. Replaces the old binary Packed/Unpacked chip (#463); the coarse
 * `packed` boolean is still used for filtering and stats, not for this label.
 */
export function StatusChip({
  status,
  size = 'sm',
  variant = 'flat',
}: {
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'flat' | 'solid' | 'dot';
}) {
  const label = status || 'Empty';
  return (
    <Chip size={size} variant={variant} color={storageStatusColor(label)}>
      {label}
    </Chip>
  );
}
