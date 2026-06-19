import { Chip } from '@heroui/react';
import { getStatusLabel, getStatusChipColor } from '../config/deploymentsConfig';

/** Deployment-status pill — maps a status string to label + HeroUI color. */
export function StatusChip({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Chip color={getStatusChipColor(status)} variant="flat" size={size}>
      {getStatusLabel(status)}
    </Chip>
  );
}
