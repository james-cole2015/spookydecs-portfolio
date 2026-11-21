import { Card, CardBody, Chip, Link as HeroLink } from '@heroui/react';
import type { DecidedDecoration, StagedDecision } from '../api/deploymentsApi';

const GROUPS: { decision: StagedDecision; label: string; hint: string }[] = [
  { decision: 'needs_repair', label: 'Needs repair', hint: 'A repair record was created. These return to Ready when you complete.' },
  { decision: 'not_deployed', label: 'Not deployed', hint: 'Staged but not put out. These return to Ready when you complete.' },
];

/** Staged decorations a human marked unused, grouped by decision (#714), for the Complete review. */
export function DecidedDecorationsList({ items, baseUrl }: { items: DecidedDecoration[]; baseUrl: string }) {
  return (
    <div className="mb-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2" data-testid="decided-lists">
      {GROUPS.map((g) => {
        const rows = items.filter((i) => i.decision === g.decision);
        if (rows.length === 0) return null;
        return (
          <Card key={g.decision} data-testid={`decided-${g.decision}`}>
            <CardBody className="gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{g.label}</h2>
                <Chip variant="flat" size="sm" color={g.decision === 'needs_repair' ? 'warning' : 'default'}>
                  {rows.length}
                </Chip>
              </div>
              <p className="text-sm text-default-500">{g.hint}</p>
              <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {rows.map((r) => (
                  <li key={r.item_id} className="flex flex-wrap items-center gap-2 text-sm">
                    <HeroLink href={`${baseUrl}/${r.item_id}`} isExternal size="sm" className="text-foreground">
                      {r.short_name || r.item_id}
                    </HeroLink>
                    {r.class_type && <span className="text-xs text-default-500">{r.class_type}</span>}
                    {r.repair_record_id && (
                      <Chip size="sm" variant="flat" title="Repair record id">
                        repair {r.repair_record_id.slice(0, 8)}
                      </Chip>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
