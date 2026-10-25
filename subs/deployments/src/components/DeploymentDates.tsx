import { useState } from 'react';
import { Button, Chip, Input } from '@heroui/react';
import { useAuth, useToast } from '@spookydecs/ui';
import { updateDeploymentStartDate } from '../api/deploymentsApi';
import { deploymentSpan, formatYmd, spanLabel, startAfterEnd } from '../lib/deploymentDates';

interface Props {
  deploymentId: string;
  startDate?: string | null;
  setupCompletedAt?: string | null;
  /** Archived deployments keep their dates but are no longer editable. */
  readOnly?: boolean;
  onSaved: () => void;
}

/**
 * Start date (inferred on the first graph item, #643), a day counter that stops when the
 * deployment is completed, and an inline override for builders.
 */
export function DeploymentDates({ deploymentId, startDate, setupCompletedAt, readOnly, onSaved }: Props) {
  const auth = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(startDate || '');
  const [saving, setSaving] = useState(false);

  const canEdit = auth.hasMinRole('builder') && !readOnly;
  const span = deploymentSpan(startDate, setupCompletedAt);
  const invalid = !value ? 'Pick a date' : startAfterEnd(value, setupCompletedAt) ? 'Start cannot be after the completion date' : null;

  if (!startDate && !editing) {
    return (
      <p className="text-sm text-default-500" data-testid="deployment-dates">
        Not started — the start date is set when the first item is added to the graph.
      </p>
    );
  }

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      const res = await updateDeploymentStartDate(deploymentId, value);
      if (!res?.success) throw new Error(res?.error || 'Failed to update start date');
      toast.showSuccess('Start date updated');
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to update start date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm" data-testid="deployment-dates">
      {editing ? (
        <>
          <Input
            type="date"
            size="sm"
            className="max-w-[180px]"
            aria-label="Start date"
            value={value}
            onValueChange={setValue}
            isInvalid={!!invalid}
            errorMessage={invalid}
            data-testid="start-date-input"
          />
          <Button size="sm" color="primary" isLoading={saving} isDisabled={!!invalid} onPress={save}>
            Save
          </Button>
          <Button size="sm" variant="light" isDisabled={saving} onPress={() => setEditing(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <span>
            <span className="text-default-500">Started</span> {formatYmd(startDate)}
          </span>
          {span && (
            <Chip size="sm" variant="flat" color={span.finished ? 'default' : 'primary'} data-testid="day-counter">
              {spanLabel(span)}
            </Chip>
          )}
          {setupCompletedAt && (
            <span>
              <span className="text-default-500">Completed</span> {formatYmd(setupCompletedAt.slice(0, 10))}
            </span>
          )}
          {canEdit && (
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setValue(startDate || '');
                setEditing(true);
              }}
              data-testid="edit-start-date"
            >
              Edit start
            </Button>
          )}
        </>
      )}
    </div>
  );
}
