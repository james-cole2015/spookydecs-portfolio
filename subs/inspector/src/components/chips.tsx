/**
 * Small chip helpers mapping inspector status/dismissible semantics to HeroUI
 * Chip colors. Replaces the vanilla `.badge.status-*` / `.badge-non-dismissible`
 * CSS classes.
 */
import { Chip } from '@heroui/react';
import type { ViolationStatus } from '../config/inspectorConfig';

type ChipColor = 'danger' | 'success' | 'default' | 'warning';

const STATUS_COLOR: Record<string, ChipColor> = {
  open: 'danger',
  resolved: 'success',
  dismissed: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export function StatusChip({ status }: { status?: ViolationStatus | string }) {
  const key = status ?? 'open';
  return (
    <Chip size="sm" variant="flat" color={STATUS_COLOR[key] ?? 'danger'}>
      {STATUS_LABEL[key] ?? 'Open'}
    </Chip>
  );
}

export function NonDismissibleChip() {
  return (
    <Chip size="sm" variant="flat" color="warning">
      ⛔ Non-dismissible
    </Chip>
  );
}

export function ActiveChip({ active }: { active?: boolean }) {
  return (
    <Chip size="sm" variant="flat" color={active ? 'success' : 'default'}>
      {active ? 'Active' : 'Inactive'}
    </Chip>
  );
}
