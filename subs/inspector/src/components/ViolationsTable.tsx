/**
 * ViolationsTable — status-tabbed (Open / Resolved / Dismissed) violations table
 * shared by RuleDetail and ItemDetail. The `variant` switches the column set:
 *   - 'rule' → Item · Issue · Status · Detected · Actions (item deep-links)
 *   - 'item' → Rule · Issue · Dismissible · Status · Detected · Actions
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs,
  Tab,
  Button,
  Link,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import {
  formatRelativeTime,
  truncateText,
  type Violation,
  type ViolationStatus,
} from '../config/inspectorConfig';
import { StatusChip, DismissibleChip } from './chips';

interface ViolationsTableProps {
  violations: Violation[];
  variant: 'rule' | 'item';
  /** Items-sub base URL for external item links (rule variant only). */
  itemsAdminUrl?: string | null;
  /** Called when a violation row is opened — lets the parent seed nav context. */
  onOpenViolation?: (violationId: string, tabViolations: Violation[], tab: ViolationStatus) => void;
}

const EMPTY: Record<ViolationStatus, string> = {
  open: 'No open violations',
  resolved: 'No resolved violations',
  dismissed: 'No dismissed violations',
};

export function ViolationsTable({
  violations,
  variant,
  itemsAdminUrl,
  onOpenViolation,
}: ViolationsTableProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ViolationStatus>('open');

  const byStatus = useMemo(
    () => ({
      open: violations.filter((v) => v.status === 'open'),
      resolved: violations.filter((v) => v.status === 'resolved'),
      dismissed: violations.filter((v) => v.status === 'dismissed'),
    }),
    [violations],
  );

  const active = byStatus[tab];

  function open(v: Violation) {
    if (onOpenViolation) onOpenViolation(v.violation_id, active, tab);
    navigate(`/inspector/violations/${v.violation_id}`);
  }

  function itemCell(v: Violation) {
    const name = v.violation_details?.item_short_name || v.entity_id;
    if (v.entity_type !== 'Item') return name;
    return (
      <span className="flex items-center gap-2">
        <Link href={`/inspector/items/${v.entity_id}`} size="sm" className="cursor-pointer">
          {name}
        </Link>
        {itemsAdminUrl && (
          <Link
            href={`${itemsAdminUrl}/${v.entity_id}`}
            isExternal
            size="sm"
            title="View in Items sub"
          >
            ↗
          </Link>
        )}
      </span>
    );
  }

  return (
    <Tabs
      aria-label="Violations by status"
      selectedKey={tab}
      onSelectionChange={(key) => setTab(key as ViolationStatus)}
    >
      {(['open', 'resolved', 'dismissed'] as ViolationStatus[]).map((status) => (
        <Tab
          key={status}
          title={`${status[0].toUpperCase()}${status.slice(1)} (${byStatus[status].length})`}
        >
          {active.length === 0 ? (
            <div className="py-10 text-center text-default-500">✓ {EMPTY[tab]}</div>
          ) : variant === 'rule' ? (
            <Table aria-label="Rule violations" removeWrapper>
              <TableHeader>
                <TableColumn>ITEM</TableColumn>
                <TableColumn>ISSUE</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>DETECTED</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {active.map((v) => (
                  <TableRow key={v.violation_id}>
                    <TableCell>{itemCell(v)}</TableCell>
                    <TableCell>{truncateText(v.violation_details?.message || 'N/A', 60)}</TableCell>
                    <TableCell>
                      <StatusChip status={v.status} />
                    </TableCell>
                    <TableCell>{formatRelativeTime(v.detected_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="flat" onPress={() => open(v)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table aria-label="Item violations" removeWrapper>
              <TableHeader>
                <TableColumn>RULE</TableColumn>
                <TableColumn>ISSUE</TableColumn>
                <TableColumn>DISMISSIBLE</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>DETECTED</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {active.map((v) => (
                  <TableRow key={v.violation_id}>
                    <TableCell>{v.rule_id}</TableCell>
                    <TableCell>{truncateText(v.violation_details?.message || 'N/A', 60)}</TableCell>
                    <TableCell>
                      <DismissibleChip dismissible={v.dismissible} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={v.status} />
                    </TableCell>
                    <TableCell>{formatRelativeTime(v.detected_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="flat" onPress={() => open(v)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Tab>
      ))}
    </Tabs>
  );
}
