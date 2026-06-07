import { Chip } from '@heroui/react';

/**
 * Packed / Unpacked status pill. Packed uses a custom sky-blue so it stays
 * distinct from the season palette (Christmas now owns green/success).
 * Unpacked is neutral.
 */
export function StatusChip({
  packed,
  size = 'sm',
  variant = 'flat',
}: {
  packed: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'flat' | 'solid' | 'dot';
}) {
  if (!packed) {
    return (
      <Chip size={size} variant={variant === 'solid' ? 'solid' : 'flat'} color="default">
        Unpacked
      </Chip>
    );
  }

  if (variant === 'solid') {
    return (
      <Chip size={size} classNames={{ base: 'bg-sky-500', content: 'text-white font-medium' }}>
        Packed
      </Chip>
    );
  }

  return (
    <Chip size={size} variant="flat" classNames={{ base: 'bg-sky-500/20', content: 'text-sky-300' }}>
      Packed
    </Chip>
  );
}
