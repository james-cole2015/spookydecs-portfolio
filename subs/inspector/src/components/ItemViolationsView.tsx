/**
 * ItemViolationsView — the "By Item" dashboard view. Violations grouped by item,
 * sorted by total count, each item a Card with a mini violations table.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import {
  calculateStats,
  groupViolationsByItem,
  truncateText,
  type Violation,
} from '../config/inspectorConfig';
import { StatusChip, NonDismissibleChip } from './chips';

export function ItemViolationsView({ violations }: { violations: Violation[] }) {
  const navigate = useNavigate();

  const items = useMemo(() => {
    const grouped = groupViolationsByItem(violations);
    grouped.sort((a, b) => b.violations.length - a.violations.length);
    return grouped;
  }, [violations]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-default-500">
        <p>✓ No items with violations found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const stats = calculateStats(item.violations);
        const nonDismissibleCount = item.violations.filter((v) => v.dismissible === false).length;

        return (
          <Card key={item.entity_id} shadow="sm" className="bg-content1">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-foreground">{item.short_name}</h4>
                <span className="text-tiny text-default-500">{item.entity_id}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip size="sm" variant="flat" color="danger">
                  🔴 {stats.open} open
                </Chip>
                {nonDismissibleCount > 0 && (
                  <Chip size="sm" variant="flat" color="warning">
                    ⛔ {nonDismissibleCount} non-dismissible
                  </Chip>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <Table aria-label={`Violations for ${item.short_name}`} removeWrapper>
                <TableHeader>
                  <TableColumn>RULE</TableColumn>
                  <TableColumn>ISSUE</TableColumn>
                  <TableColumn>DISMISSIBLE</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {item.violations.map((v) => (
                    <TableRow key={v.violation_id}>
                      <TableCell>{truncateText(v.rule_id, 25)}</TableCell>
                      <TableCell>
                        {truncateText(v.violation_details?.message || 'N/A', 40)}
                      </TableCell>
                      <TableCell>{v.dismissible === false ? <NonDismissibleChip /> : ''}</TableCell>
                      <TableCell>
                        <StatusChip status={v.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => navigate(`/inspector/violations/${v.violation_id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
