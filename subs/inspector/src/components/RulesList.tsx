/**
 * RulesList — the "By Rule" dashboard view. Rules grouped by dismissible policy,
 * each an expandable accordion with description, actions (View / Deactivate / Run
 * / Export), and a preview of up to 5 open violations. HeroUI Accordion + Table.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionItem,
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import { ConfirmDialog, useToast } from '@spookydecs/ui';
import { InspectorAPI } from '../api/inspectorApi';
import {
  formatDateTime,
  formatRelativeTime,
  groupViolationsByRule,
  truncateText,
  type Rule,
  type Violation,
} from '../config/inspectorConfig';
import { exportViolationsCsv } from '../lib/csv';

interface RulesListProps {
  rules: Rule[];
  violations: Violation[];
  /** Reload rules + violations from the parent after a mutation. */
  onReload: () => Promise<void> | void;
}

const GROUPS = [
  { key: 'false', label: 'Non-dismissible', icon: '⛔' },
  { key: 'true', label: 'Dismissible', icon: '✅' },
] as const;

export function RulesList({ rules, violations, onReload }: RulesListProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Rule | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const violationsByRule = useMemo(() => groupViolationsByRule(violations), [violations]);

  const grouped = useMemo(() => {
    const out: Record<string, Rule[]> = { false: [], true: [] };
    rules.forEach((rule) => {
      if (!rule.is_active) return;
      const key = rule.dismissible === false ? 'false' : 'true';
      out[key].push(rule);
    });
    return out;
  }, [rules]);

  const openViolationsFor = (ruleId: string) =>
    (violationsByRule[ruleId] || []).filter((v) => !v.status || v.status === 'open');

  async function runRule(rule: Rule) {
    setRunningId(rule.rule_id);
    try {
      await InspectorAPI.executeRule(rule.rule_id, rule.rule_category);
      toast.showSuccess(`Rule "${rule.rule_name}" executed successfully`);
      setTimeout(async () => {
        await onReload();
        setRunningId(null);
      }, 2000);
    } catch (error) {
      toast.showError(`Failed to run rule: ${(error as Error).message}`);
      setRunningId(null);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await InspectorAPI.deleteRule(deactivateTarget.rule_id);
      toast.showSuccess('Rule deactivated successfully');
      setDeactivateTarget(null);
      await onReload();
    } catch (error) {
      toast.showError(`Failed to deactivate rule: ${(error as Error).message}`);
    } finally {
      setDeactivating(false);
    }
  }

  if (rules.length === 0) {
    return (
      <div className="py-16 text-center text-default-500">
        <p>No rules found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(({ key, label, icon }) => {
        const groupRules = grouped[key];
        if (!groupRules || groupRules.length === 0) return null;

        const totalOpen = groupRules.reduce(
          (sum, rule) => sum + openViolationsFor(rule.rule_id).length,
          0,
        );

        return (
          <section key={key}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {icon} {label}
              </h3>
              <Chip size="sm" variant="flat" color="default">
                {totalOpen}
              </Chip>
            </div>

            <Accordion variant="bordered" selectionMode="multiple">
              {groupRules.map((rule) => {
                const allViolations = violationsByRule[rule.rule_id] || [];
                const open = openViolationsFor(rule.rule_id);
                return (
                  <AccordionItem
                    key={rule.rule_id}
                    aria-label={rule.rule_name}
                    title={
                      <div className="flex flex-wrap items-center justify-between gap-2 pr-2">
                        <span className="font-medium text-foreground">{rule.rule_name}</span>
                        <span className="flex items-center gap-3 text-tiny text-default-500">
                          <span>Last executed: {formatDateTime(rule.last_executed_at)}</span>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={open.length > 0 ? 'danger' : 'default'}
                          >
                            {open.length} violation{open.length !== 1 ? 's' : ''}
                          </Chip>
                        </span>
                      </div>
                    }
                  >
                    <div className="space-y-4 pb-2">
                      <p className="text-default-600">{rule.description}</p>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => navigate(`/inspector/rules/${rule.rule_id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          onPress={() => setDeactivateTarget(rule)}
                        >
                          Deactivate
                        </Button>
                        <Button
                          size="sm"
                          color="primary"
                          isLoading={runningId === rule.rule_id}
                          onPress={() => runRule(rule)}
                        >
                          ▶ Run Rule
                        </Button>
                        {allViolations.length > 0 && (
                          <Button
                            size="sm"
                            variant="flat"
                            color="secondary"
                            onPress={() =>
                              exportViolationsCsv(
                                open,
                                `violations-${rule.rule_name.replace(/\s+/g, '-').toLowerCase()}.csv`,
                              )
                            }
                          >
                            📄 Export CSV
                          </Button>
                        )}
                      </div>

                      {open.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-small font-semibold text-foreground">
                            Open Violations ({open.length})
                          </h4>
                          <Table aria-label={`Open violations for ${rule.rule_name}`} removeWrapper>
                            <TableHeader>
                              <TableColumn>ITEM</TableColumn>
                              <TableColumn>ISSUE</TableColumn>
                              <TableColumn>DETECTED</TableColumn>
                              <TableColumn>ACTIONS</TableColumn>
                            </TableHeader>
                            <TableBody>
                              {open.slice(0, 5).map((v) => (
                                <TableRow key={v.violation_id}>
                                  <TableCell>
                                    {v.violation_details?.item_short_name || v.entity_id}
                                  </TableCell>
                                  <TableCell>
                                    {truncateText(v.violation_details?.message || 'N/A', 60)}
                                  </TableCell>
                                  <TableCell>{formatRelativeTime(v.detected_at)}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="flat"
                                      onPress={() =>
                                        navigate(`/inspector/violations/${v.violation_id}`)
                                      }
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {open.length > 5 && (
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => navigate(`/inspector/rules/${rule.rule_id}`)}
                            >
                              See More Violations ({open.length - 5} more)
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>
        );
      })}

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Deactivate Rule"
        body={
          deactivateTarget
            ? `Are you sure you want to deactivate "${deactivateTarget.rule_name}"? This will mark the rule as inactive.`
            : ''
        }
        confirmLabel="Deactivate"
        isDestructive
        isLoading={deactivating}
        onConfirm={confirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
