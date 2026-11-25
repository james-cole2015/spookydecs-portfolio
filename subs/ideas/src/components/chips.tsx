// Shared chip helpers — season + status pills used across cards, detail, build.
import { Chip } from '@heroui/react';
import { seasonChipColor } from '@spookydecs/ui';
import { STATUS_CHIP_COLOR, STEP_STATUS_CHIP_COLOR, type StepStatus } from '../config/ideasConfig';

export function SeasonChip({ season, size = 'sm' }: { season: string; size?: 'sm' | 'md' }) {
  // Season color comes from the shared map (design.md §5): Halloween=warning,
  // Christmas=success, Shared=secondary. No hardcoded Tailwind palette here (#728).
  return (
    <Chip size={size} variant="bordered" color={seasonChipColor(season)}>
      {season}
    </Chip>
  );
}

export function StatusChip({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  return (
    <Chip size={size} variant="flat" color={STATUS_CHIP_COLOR[status] || 'default'}>
      {status}
    </Chip>
  );
}

export function StepStatusChip({ status, size = 'sm' }: { status?: StepStatus; size?: 'sm' | 'md' }) {
  const s = status ?? 'pending';
  return (
    <Chip size={size} variant="flat" color={STEP_STATUS_CHIP_COLOR[s]}>
      {s.replace('_', ' ')}
    </Chip>
  );
}
