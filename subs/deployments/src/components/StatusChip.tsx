import { StatusChip as UiStatusChip } from '@spookydecs/ui';
import { getStatusLabel, DEPLOYMENT_STATUS_COLORS } from '../config/deploymentsConfig';

/** Deployment-status pill — binds the shared StatusChip to the deployments status map + labels. */
export function StatusChip({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <UiStatusChip
      value={status}
      colorMap={DEPLOYMENT_STATUS_COLORS}
      label={getStatusLabel(status)}
      size={size}
    />
  );
}
