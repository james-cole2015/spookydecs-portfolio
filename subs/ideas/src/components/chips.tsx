// Shared chip helpers — season + status pills used across cards, detail, build.
import { Chip } from '@heroui/react';
import { STATUS_CHIP_COLOR, STEP_STATUS_CHIP_COLOR, type StepStatus } from '../config/ideasConfig';

const SEASON_CLASS: Record<string, string> = {
  Halloween: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Christmas: 'bg-green-500/15 text-green-400 border-green-500/30',
  Shared: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export function SeasonChip({ season, size = 'sm' }: { season: string; size?: 'sm' | 'md' }) {
  return (
    <Chip
      size={size}
      variant="bordered"
      className={SEASON_CLASS[season] || SEASON_CLASS.Shared}
    >
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
