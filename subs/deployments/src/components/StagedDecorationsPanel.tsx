import { useState } from 'react';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { ConfirmDialog } from '@spookydecs/ui';
import type { UnresolvedDecoration } from '../api/deploymentsApi';
import { NeedsRepairModal } from './NeedsRepairModal';

interface Props {
  unresolved: UnresolvedDecoration[];
  /** Persist a "Not deployed" decision for one item. Rejects on failure. */
  onNotDeployed: (itemId: string) => Promise<void>;
  /** Persist a "Needs repair" decision once the repair record exists. Rejects on failure. */
  onNeedsRepair: (itemId: string, repairRecordId: string) => Promise<void>;
  /** e.g. "Halloween 2026 (DEP-HAL-2026)", used in the repair record's description. */
  deploymentLabel: string;
}

/**
 * Staged decorations with no placement, connection or decision (#714). Complete stays disabled
 * until this list is empty.
 */
export function StagedDecorationsPanel({ unresolved, onNotDeployed, onNeedsRepair, deploymentLabel }: Props) {
  const [pending, setPending] = useState<UnresolvedDecoration | null>(null);
  const [repairing, setRepairing] = useState<UnresolvedDecoration | null>(null);
  const [busy, setBusy] = useState(false);

  if (unresolved.length === 0) return null;

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await onNotDeployed(pending.item_id);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-6" data-testid="unresolved-panel">
      <CardBody className="gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Needs a decision</h2>
          <Chip color="warning" variant="flat" size="sm">
            {unresolved.length}
          </Chip>
        </div>
        <p className="text-sm text-default-500">
          These decorations were staged but have no placement or connection. Place them, or say what happened before
          you can complete the deployment.
        </p>
        <ul className="flex flex-col gap-2">
          {unresolved.map((d) => (
            <li
              key={d.item_id}
              data-testid={`unresolved-${d.item_id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-medium bg-default-100 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{d.short_name || d.item_id}</div>
                <div className="text-xs text-default-500">
                  {[d.class_type, d.status].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="flat" onPress={() => setPending(d)} data-testid={`not-deployed-${d.item_id}`}>
                  Not deployed
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="warning"
                  onPress={() => setRepairing(d)}
                  data-testid={`needs-repair-${d.item_id}`}
                >
                  Needs repair
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>

      <ConfirmDialog
        isOpen={!!pending}
        title="Mark as not deployed?"
        body={
          <>
            <strong>{pending?.short_name || pending?.item_id}</strong> was staged but never placed. It will go back to
            Ready (if it had left its tote) and stop blocking this deployment.
          </>
        }
        confirmLabel="Not deployed"
        confirmTestId="not-deployed-confirm"
        isLoading={busy}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />

      <NeedsRepairModal
        item={repairing}
        deploymentLabel={deploymentLabel}
        onSaved={onNeedsRepair}
        onClose={() => setRepairing(null)}
      />
    </Card>
  );
}
