/**
 * Idea + maintenance cards for the seasonal monitor. Each card is pressable and
 * surfaces a normalized CardPreview to its parent (which opens the preview
 * modal) — replacing the vanilla data-* attribute + click-delegation scheme.
 */
import { Card, CardBody, Chip } from '@heroui/react';
import { Typography } from '@spookydecs/ui';
import type { IdeaRecord, MaintenanceRecord } from '../../types/workbench';
import { formatStatus, statusChipColor, criticalityChipColor, type ChipColor } from '../../lib/format';

export interface CardPreview {
  type: 'idea' | 'maintenance';
  title: string;
  status: string;
  statusColor: ChipColor;
  /** Deep link to the source record ("View Record ↗"). */
  href: string;
  // idea fields
  description?: string;
  link?: string;
  notes?: string;
  // maintenance fields
  scheduled?: string;
  criticality?: string;
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
    statusColor: statusChipColor(idea.status),
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
          <Chip size="sm" variant="flat" color={preview.statusColor} className="shrink-0 capitalize">
            {formatStatus(idea.status)}
          </Chip>
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
  const preview: CardPreview = {
    type: 'maintenance',
    title,
    status: record.status,
    statusColor: statusChipColor(record.status),
    href,
    scheduled: record.date_scheduled,
    criticality: record.criticality,
    description: record.description,
  };

  return (
    <Card isPressable isHoverable shadow="sm" className="w-full" onPress={() => onSelect(preview)}>
      <CardBody className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <Typography type="body-sm" className="font-medium text-foreground">{title}</Typography>
          <Chip size="sm" variant="flat" color={preview.statusColor} className="shrink-0 capitalize">
            {formatStatus(record.status)}
          </Chip>
        </div>
        {(record.date_scheduled || record.criticality) && (
          <div className="flex flex-wrap items-center gap-2">
            {record.date_scheduled && (
              <Typography type="body-xs" className="text-default-500">Scheduled: {record.date_scheduled}</Typography>
            )}
            {record.criticality && (
              <Chip size="sm" variant="flat" color={criticalityChipColor(record.criticality)} className="capitalize">
                {formatStatus(record.criticality)}
              </Chip>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
