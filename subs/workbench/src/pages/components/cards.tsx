/**
 * Idea + maintenance cards for the seasonal monitor. Each card is pressable and
 * surfaces a normalized CardPreview to its parent (which opens the preview
 * modal) — replacing the vanilla data-* attribute + click-delegation scheme.
 */
import { Card, CardBody } from '@heroui/react';
import { Typography, StatusChip } from '@spookydecs/ui';
import type { IdeaRecord, MaintenanceRecord } from '../../types/workbench';
import {
  formatStatus,
  statusKey,
  WORKBENCH_STATUS_COLORS,
  WORKBENCH_CRITICALITY_COLORS,
} from '../../lib/format';

export interface CardPreview {
  type: 'idea' | 'maintenance';
  title: string;
  status: string;
  /** Deep link to the source record ("View Record ↗"). */
  href: string;
  // idea fields
  description?: string;
  link?: string;
  notes?: string;
  // maintenance fields
  criticality?: string;
  /** The item under maintenance — resolved name, falling back to the item id. */
  object?: string;
}

const DESC_PREVIEW_LEN = 100;

export function IdeaCard({
  idea,
  href,
  onSelect,
}: {
  idea: IdeaRecord;
  href: string;
  onSelect: (preview: CardPreview) => void;
}) {
  const preview: CardPreview = {
    type: 'idea',
    title: idea.title,
    status: idea.status,
    href,
    description: idea.description,
    link: idea.link,
    notes: idea.notes,
  };

  const truncated = idea.description
    ? idea.description.slice(0, DESC_PREVIEW_LEN) + (idea.description.length > DESC_PREVIEW_LEN ? '…' : '')
    : '';

  return (
    <Card isPressable isHoverable shadow="sm" className="w-full" onPress={() => onSelect(preview)}>
      <CardBody className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <Typography type="body-sm" className="font-medium text-foreground">{idea.title}</Typography>
          <StatusChip
            value={statusKey(idea.status)}
            colorMap={WORKBENCH_STATUS_COLORS}
            label={formatStatus(idea.status)}
            size="sm"
            variant="flat"
            className="shrink-0 capitalize"
          />
        </div>
        {truncated && <Typography type="body-xs" className="text-default-500">{truncated}</Typography>}
      </CardBody>
    </Card>
  );
}

export function MaintenanceCard({
  record,
  href,
  onSelect,
}: {
  record: MaintenanceRecord;
  href: string;
  onSelect: (preview: CardPreview) => void;
}) {
  const title = record.title || 'Untitled';
  const object = record.item_name || record.item_id || '';
  const preview: CardPreview = {
    type: 'maintenance',
    title,
    status: record.status,
    href,
    criticality: record.criticality,
    description: record.description,
    object,
  };

  return (
    <Card isPressable isHoverable shadow="sm" className="w-full" onPress={() => onSelect(preview)}>
      <CardBody className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <Typography type="body-sm" className="font-medium text-foreground">{title}</Typography>
          <StatusChip
            value={statusKey(record.status)}
            colorMap={WORKBENCH_STATUS_COLORS}
            label={formatStatus(record.status)}
            size="sm"
            variant="flat"
            className="shrink-0 capitalize"
          />
        </div>
        {object && (
          <Typography type="body-xs" className="text-default-500">
            <span className="text-default-400">Item:</span> {object}
          </Typography>
        )}
        {record.criticality && (
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip
              value={statusKey(record.criticality)}
              colorMap={WORKBENCH_CRITICALITY_COLORS}
              label={formatStatus(record.criticality)}
              size="sm"
              variant="flat"
              className="capitalize"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
