/**
 * ViolationDetail — full single-violation view: metadata, issue description,
 * extracted reason, IG analysis (Violation.Annotated), editable notes, and the
 * Dismiss / Run IG / Delete actions. Prev/Next navigation comes from the
 * sessionStorage nav context seeded by RuleDetail. Mirrors violation-detail.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Link,
  Code,
  Textarea,
} from '@heroui/react';
import { Breadcrumbs, LoadingState, ErrorState, useConfig, useToast, ConfirmDialog } from '@spookydecs/ui';
import { InspectorAPI } from '../api/inspectorApi';
import {
  formatDate,
  getDismissibleConfig,
  type Violation,
} from '../config/inspectorConfig';
import { ViolationReason } from '../components/ViolationReason';
import { IGAnalysisCard } from '../components/IGAnalysisCard';
import { DismissModal } from '../components/DismissModal';
import { getNavContext, type NavContext } from '../lib/navContext';

const IG_POLL_INTERVAL = 3000;
const IG_POLL_TIMEOUT = 60000;

export default function ViolationDetail() {
  const { violationId = '' } = useParams();
  const navigate = useNavigate();
  const config = useConfig();
  const toast = useToast();
  const itemsAdminUrl = (config.ITEMS_ADMIN as string | undefined) || null;

  const [violation, setViolation] = useState<Violation | null>(null);
  const [navCtx, setNavCtx] = useState<NavContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [igRunning, setIgRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await InspectorAPI.getViolation(violationId);
      setViolation(data.violation);
      setNotes(data.violation.violation_details?.notes || '');
      setNavCtx(getNavContext(violationId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [violationId]);

  useEffect(() => {
    void load();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [load]);

  async function reloadViolation() {
    try {
      const data = await InspectorAPI.getViolation(violationId);
      setViolation(data.violation);
    } catch {
      toast.showError('Failed to refresh violation details');
    }
  }

  async function saveNotes() {
    if (!violation) return;
    setSavingNotes(true);
    try {
      await InspectorAPI.updateViolation(violation.violation_id, notes.trim());
      toast.showSuccess('Notes saved successfully');
      setViolation({
        ...violation,
        violation_details: { ...violation.violation_details, notes: notes.trim() },
      });
    } catch (e) {
      toast.showError(`Failed to save notes: ${(e as Error).message}`);
    } finally {
      setSavingNotes(false);
    }
  }

  async function confirmDelete() {
    if (!violation) return;
    setDeleting(true);
    try {
      await InspectorAPI.deleteViolation(violation.violation_id);
      toast.showSuccess('Violation deleted successfully');
      setTimeout(() => {
        const ids = navCtx?.violationIds;
        const idx = ids?.indexOf(violation.violation_id) ?? -1;
        if (ids && idx !== -1) {
          const nextId = ids[idx + 1] || ids[idx - 1];
          if (nextId) {
            navigate(`/inspector/violations/${nextId}`);
            return;
          }
        }
        navigate(-1);
      }, 800);
    } catch (e) {
      toast.showError(`Failed to delete violation: ${(e as Error).message}`);
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function runIG() {
    if (!violation) return;
    setIgRunning(true);
    try {
      await InspectorAPI.runIG(violation.violation_id);
      toast.showSuccess('Inspector Gadget invoked — analysis will appear shortly');

      const started = Date.now();
      const poll = async () => {
        if (Date.now() - started >= IG_POLL_TIMEOUT) {
          setIgRunning(false);
          toast.showError('IG is taking longer than expected — check back soon');
          return;
        }
        try {
          const data = await InspectorAPI.getViolation(violation.violation_id);
          if (data.violation.agent_notes) {
            setViolation(data.violation);
            setIgRunning(false);
            return;
          }
        } catch {
          /* keep polling */
        }
        pollTimer.current = setTimeout(poll, IG_POLL_INTERVAL);
      };
      pollTimer.current = setTimeout(poll, IG_POLL_INTERVAL);
    } catch (e) {
      toast.showError(`Failed to invoke Inspector Gadget: ${(e as Error).message}`);
      setIgRunning(false);
    }
  }

  function copyId() {
    if (!violation) return;
    navigator.clipboard
      .writeText(violation.violation_id)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  const crumbs = [{ label: 'Inspector', to: '/inspector' }, { label: 'Violation' }];

  if (loading) {
    return (
      <div>
        <Breadcrumbs crumbs={crumbs} />
        <LoadingState label="Loading violation…" />
      </div>
    );
  }
  if (error || !violation) {
    return (
      <div>
        <Breadcrumbs crumbs={crumbs} />
        <ErrorState message={error || 'Violation not found'} onRetry={() => void load()} />
      </div>
    );
  }

  const dismissibleConfig = getDismissibleConfig(violation.dismissible);
  const details = violation.violation_details || {};
  const isDuplicate =
    violation.rule_id === 'DUPLICATE_LIGHTS' || violation.rule_id === 'DUPLICATE_ITEMS';
  const canDismiss = violation.dismissible !== false && violation.status === 'open';

  const itemDisplay = isDuplicate
    ? `${details.item1_short_name || 'Unknown'} & ${details.item2_short_name || 'Unknown'}`
    : details.item_short_name || violation.entity_id;
  const itemClass = isDuplicate ? details.item1_class || 'Unknown' : details.item_class || 'Unknown';

  // Prev/Next nav
  const ids = navCtx?.violationIds ?? [];
  const navIdx = ids.indexOf(violation.violation_id);
  const hasPrev = navIdx > 0;
  const hasNext = navIdx >= 0 && navIdx < ids.length - 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs crumbs={crumbs} />
        {navCtx && navIdx >= 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              isDisabled={!hasPrev}
              onPress={() => navigate(`/inspector/violations/${ids[navIdx - 1]}`)}
            >
              ← Prev
            </Button>
            <span className="text-tiny text-default-500">
              {navIdx + 1} of {ids.length} {navCtx.tab}
            </span>
            <Button
              size="sm"
              variant="flat"
              isDisabled={!hasNext}
              onPress={() => navigate(`/inspector/violations/${ids[navIdx + 1]}`)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Violation Details</h1>
          <div className="flex flex-wrap gap-2">
            {violation.dismissible === false && (
              <Chip size="sm" variant="flat" color="warning">
                {dismissibleConfig.icon} {dismissibleConfig.label}
              </Chip>
            )}
            <Chip
              size="sm"
              variant="flat"
              color={
                violation.status === 'open'
                  ? 'danger'
                  : violation.status === 'resolved'
                    ? 'success'
                    : 'default'
              }
            >
              {violation.status[0].toUpperCase() + violation.status.slice(1)}
            </Chip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {violation.status === 'open' && (
            <Button size="sm" variant="flat" isLoading={igRunning} onPress={runIG}>
              Run IG
            </Button>
          )}
          <Button size="sm" variant="flat" isDisabled title="Auto-resolution coming in Phase 4">
            Resolve
          </Button>
          <Button
            size="sm"
            variant="flat"
            isDisabled={!canDismiss}
            title={
              !canDismiss && violation.dismissible === false
                ? 'This violation cannot be dismissed (rule policy)'
                : undefined
            }
            onPress={() => setDismissOpen(true)}
          >
            Dismiss
          </Button>
        </div>
      </div>

      {igRunning && (
        <p className="text-small text-secondary">Inspector Gadget is analyzing this violation…</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Metadata */}
        <Card shadow="sm" className="bg-content1 lg:col-span-1">
          <CardHeader>
            <h3 className="font-semibold text-foreground">Metadata</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-small">
              <dt className="text-default-500">Violation ID:</dt>
              <dd className="flex items-center gap-2 text-foreground">
                <Code size="sm">{violation.violation_id}</Code>
                <button
                  type="button"
                  className="text-default-500 hover:text-foreground"
                  title="Copy violation ID"
                  onClick={copyId}
                >
                  {copied ? '✓' : '⎘'}
                </button>
              </dd>

              <dt className="text-default-500">{isDuplicate ? 'Items:' : 'Item:'}</dt>
              <dd className="text-foreground">{itemDisplay}</dd>

              <dt className="text-default-500">Entity ID:</dt>
              <dd className="text-foreground">{violation.entity_id}</dd>

              {violation.entity_type === 'Item' && !isDuplicate && (
                <>
                  <dt className="text-default-500">Quick Links:</dt>
                  <dd className="flex flex-wrap gap-3">
                    <Link href={`/inspector/items/${violation.entity_id}`} isExternal size="sm">
                      Inspector Detail ↗
                    </Link>
                    {itemsAdminUrl && (
                      <Link href={`${itemsAdminUrl}/${violation.entity_id}`} isExternal size="sm">
                        View in Items ↗
                      </Link>
                    )}
                  </dd>
                </>
              )}

              {isDuplicate && (
                <>
                  <dt className="text-default-500">Item 1 ID:</dt>
                  <dd className="text-foreground">{details.item1_id || 'N/A'}</dd>
                  <dt className="text-default-500">Item 2 ID:</dt>
                  <dd className="text-foreground">{details.item2_id || 'N/A'}</dd>
                </>
              )}

              <dt className="text-default-500">Entity Type:</dt>
              <dd className="text-foreground">{violation.entity_type}</dd>
              <dt className="text-default-500">Item Class:</dt>
              <dd className="text-foreground">{itemClass}</dd>
              <dt className="text-default-500">Rule ID:</dt>
              <dd className="text-foreground">{violation.rule_id}</dd>
              <dt className="text-default-500">Detected:</dt>
              <dd className="text-foreground">{formatDate(violation.detected_at)}</dd>
              <dt className="text-default-500">Last Evaluated:</dt>
              <dd className="text-foreground">{formatDate(violation.last_evaluated_at)}</dd>

              {violation.resolved_at && (
                <>
                  <dt className="text-default-500">Resolved:</dt>
                  <dd className="text-foreground">{formatDate(violation.resolved_at)}</dd>
                </>
              )}

              {violation.dismissed_at && (
                <>
                  <dt className="text-default-500">Dismissed:</dt>
                  <dd className="text-foreground">{formatDate(violation.dismissed_at)}</dd>
                  <dt className="text-default-500">Dismissed By:</dt>
                  <dd className="text-foreground">{violation.dismissed_by || 'N/A'}</dd>
                  {details.dismissal_notes && (
                    <>
                      <dt className="text-default-500">Dismissal Reason:</dt>
                      <dd className="text-foreground">{details.dismissal_notes}</dd>
                    </>
                  )}
                </>
              )}

              <dt className="text-default-500">Updated:</dt>
              <dd className="text-foreground">{formatDate(violation.updated_at)}</dd>
              {violation.updated_by && (
                <>
                  <dt className="text-default-500">Updated By:</dt>
                  <dd className="text-foreground">{violation.updated_by}</dd>
                </>
              )}
            </dl>
          </CardBody>
        </Card>

        {/* Main content */}
        <div className="space-y-4 lg:col-span-2">
          <Card shadow="sm" className="bg-content1">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Issue Description</h3>
            </CardHeader>
            <CardBody className="text-default-700">{details.message || 'No message available'}</CardBody>
          </Card>

          <Card shadow="sm" className="bg-content1">
            <CardBody>
              <ViolationReason violation={violation} />
            </CardBody>
          </Card>

          <IGAnalysisCard violation={violation} />

          <Card shadow="sm" className="bg-content1">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Notes</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <Textarea
                minRows={5}
                value={notes}
                onValueChange={setNotes}
                placeholder="Add notes about this violation..."
              />
              <div>
                <Button color="primary" size="sm" isLoading={savingNotes} onPress={saveNotes}>
                  Save Notes
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card shadow="sm" className="bg-content1">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Actions</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {violation.dismissible === false && violation.status === 'open' && (
                <div className="rounded-medium border border-warning/40 bg-warning/10 p-3 text-small text-warning-700">
                  ⚠️ <strong>This violation cannot be dismissed.</strong>
                  <p>The rule policy requires this issue to be fixed, not dismissed.</p>
                </div>
              )}
              <Button color="danger" variant="flat" size="sm" onPress={() => setDeleteOpen(true)}>
                Delete Violation
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <DismissModal
        isOpen={dismissOpen}
        violation={violation}
        onClose={() => setDismissOpen(false)}
        onDismissed={reloadViolation}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete Violation"
        body="Are you sure you want to permanently delete this violation? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
