/**
 * RuleDetail — single rule view: header + badges + actions (Edit Description,
 * Export CSV, Run Rule, Deactivate), info cards, and a status-tabbed violations
 * table. Mirrors the vanilla rule-detail.js.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from '@heroui/react';
import {
  Breadcrumbs,
  LoadingState,
  ErrorState,
  useConfig,
  useToast,
  ConfirmDialog,
} from '@spookydecs/ui';
import { InspectorAPI } from '../api/inspectorApi';
import {
  calculateStats,
  formatDateTime,
  getDismissibleConfig,
  getRuleCategoryConfig,
  type Rule,
  type Violation,
  type ViolationStatus,
} from '../config/inspectorConfig';
import { ViolationsTable } from '../components/ViolationsTable';
import { exportViolationsCsv } from '../lib/csv';
import { setNavContext } from '../lib/navContext';

const MAX_DESC = 1000;

export default function RuleDetail() {
  const { ruleId = '' } = useParams();
  const navigate = useNavigate();
  const config = useConfig();
  const toast = useToast();
  const itemsAdminUrl = (config.ITEMS_ADMIN as string | undefined) || null;

  const [rule, setRule] = useState<Rule | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [draftDesc, setDraftDesc] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ruleData, violationsData] = await Promise.all([
        InspectorAPI.getRule(ruleId),
        InspectorAPI.getViolationsForRule(ruleId),
      ]);
      setRule(ruleData.rule);
      setViolations(violationsData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runRule() {
    if (!rule) return;
    setRunning(true);
    try {
      await InspectorAPI.executeRule(rule.rule_id, rule.rule_category);
      toast.showSuccess('Rule executed successfully');
      setTimeout(async () => {
        await load();
        setRunning(false);
      }, 2000);
    } catch (e) {
      toast.showError(`Failed to run rule: ${(e as Error).message}`);
      setRunning(false);
    }
  }

  async function saveDescription() {
    if (!rule) return;
    const next = draftDesc.trim();
    if (!next) {
      toast.showError('Description cannot be empty');
      return;
    }
    setSavingDesc(true);
    try {
      const response = await InspectorAPI.updateRule(rule.rule_id, {
        description: next,
        updated_by: 'frontend-update',
      });
      setRule(response.rule);
      toast.showSuccess('Description updated successfully');
      setEditOpen(false);
    } catch (e) {
      toast.showError(`Failed to update description: ${(e as Error).message}`);
    } finally {
      setSavingDesc(false);
    }
  }

  async function confirmDeactivate() {
    if (!rule) return;
    setDeactivating(true);
    try {
      await InspectorAPI.deleteRule(rule.rule_id);
      toast.showSuccess('Rule deactivated successfully');
      setTimeout(() => navigate('/inspector'), 800);
    } catch (e) {
      toast.showError(`Failed to deactivate rule: ${(e as Error).message}`);
      setDeactivating(false);
      setDeactivateOpen(false);
    }
  }

  function seedNav(_id: string, tabViolations: Violation[], tab: ViolationStatus) {
    if (rule) setNavContext(tabViolations, tab, rule.rule_id);
  }

  const crumbs = [{ label: 'Inspector', to: '/inspector' }, { label: rule?.rule_name || 'Rule' }];

  if (loading) {
    return (
      <div>
        <Breadcrumbs crumbs={crumbs} />
        <LoadingState label="Loading rule…" />
      </div>
    );
  }
  if (error || !rule) {
    return (
      <div>
        <Breadcrumbs crumbs={crumbs} />
        <ErrorState message={error || 'Rule not found'} onRetry={() => void load()} />
      </div>
    );
  }

  const dismissibleConfig = getDismissibleConfig(rule.dismissible);
  const categoryConfig = getRuleCategoryConfig(rule.rule_category);
  const stats = calculateStats(violations);

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={crumbs} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{rule.rule_name}</h1>
          <div className="flex flex-wrap gap-2">
            <Chip size="sm" variant="flat" color={rule.dismissible === false ? 'warning' : 'success'}>
              {dismissibleConfig.icon} {dismissibleConfig.label}
            </Chip>
            <Chip size="sm" variant="flat" color={rule.is_active ? 'success' : 'default'}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </Chip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              setDraftDesc(rule.description || '');
              setEditOpen(true);
            }}
          >
            ✏️ Edit Description
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="secondary"
            onPress={() =>
              exportViolationsCsv(
                violations.filter((v) => v.status === 'open'),
                `violations-${rule.rule_id.toLowerCase()}-open.csv`,
              )
            }
          >
            📄 Export CSV
          </Button>
          <Button size="sm" color="primary" isLoading={running} onPress={runRule}>
            ▶ Run Rule
          </Button>
          <Button size="sm" variant="flat" color="danger" onPress={() => setDeactivateOpen(true)}>
            Deactivate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card shadow="sm" className="bg-content1">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Description</h3>
            <span className="text-tiny text-default-500">
              Last executed: {formatDateTime(rule.last_executed_at)}
            </span>
          </CardHeader>
          <CardBody className="text-default-600">{rule.description}</CardBody>
        </Card>

        <Card shadow="sm" className="bg-content1">
          <CardHeader>
            <h3 className="font-semibold text-foreground">Rule Details</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-small">
              <dt className="text-default-500">Rule ID:</dt>
              <dd className="text-foreground">{rule.rule_id}</dd>
              <dt className="text-default-500">Category:</dt>
              <dd className="text-foreground">{categoryConfig ? categoryConfig.label : rule.rule_category}</dd>
              <dt className="text-default-500">Check Type:</dt>
              <dd className="text-foreground">{rule.check_type || 'N/A'}</dd>
              <dt className="text-default-500">Created:</dt>
              <dd className="text-foreground">{formatDateTime(rule.created_at)}</dd>
              <dt className="text-default-500">Last Updated:</dt>
              <dd className="text-foreground">{formatDateTime(rule.updated_at)}</dd>
              <dt className="text-default-500">Updated By:</dt>
              <dd className="text-foreground">{rule.updated_by || 'N/A'}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card shadow="sm" className="bg-content1">
          <CardHeader>
            <h3 className="font-semibold text-foreground">Violation Statistics</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['Total', stats.total],
                ['Open', stats.open],
                ['Resolved', stats.resolved],
                ['Dismissed', stats.dismissed],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-tiny uppercase text-default-500">{label}</span>
                  <span className="text-xl font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Violations ({violations.length})</h2>
        <ViolationsTable
          violations={violations}
          variant="rule"
          itemsAdminUrl={itemsAdminUrl}
          onOpenViolation={seedNav}
        />
      </section>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} backdrop="blur" size="lg">
        <ModalContent>
          <ModalHeader>Edit Rule Description</ModalHeader>
          <ModalBody>
            <Textarea
              autoFocus
              minRows={6}
              maxLength={MAX_DESC}
              value={draftDesc}
              onValueChange={setDraftDesc}
              placeholder="Enter rule description..."
              description={`${draftDesc.length} / ${MAX_DESC} characters`}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditOpen(false)} isDisabled={savingDesc}>
              Cancel
            </Button>
            <Button color="primary" onPress={saveDescription} isLoading={savingDesc}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={deactivateOpen}
        title="Deactivate Rule"
        body={`Are you sure you want to deactivate "${rule.rule_name}"? This will mark the rule as inactive.`}
        confirmLabel="Deactivate"
        isDestructive
        isLoading={deactivating}
        onConfirm={confirmDeactivate}
        onClose={() => setDeactivateOpen(false)}
      />
    </div>
  );
}
