/**
 * A single season column: header (label + active count), the four work sections,
 * and a collapsible "completed" disclosure. Renders idea cards in the Ideas
 * section and maintenance cards everywhere else, matching the vanilla layout.
 */
import { Accordion, AccordionItem, Chip } from '@heroui/react';
import { Typography } from '@spookydecs/ui';
import type { IdeaRecord, MaintenanceRecord, SeasonBucket, CompletedBucket } from '../../types/workbench';
import { SECTIONS, bucketActiveCount, type BucketDef } from '../seasonModel';
import { IdeaCard, MaintenanceCard, type CardPreview } from './cards';

interface LinkBuilders {
  ideaHref: (idea: IdeaRecord) => string;
  maintHref: (record: MaintenanceRecord) => string;
}

function IdeaList({
  ideas,
  links,
  onSelect,
}: {
  ideas: IdeaRecord[];
  links: LinkBuilders;
  onSelect: (p: CardPreview) => void;
}) {
  return (
    <>
      {ideas.map((idea) => (
        <IdeaCard key={idea.idea_id} idea={idea} href={links.ideaHref(idea)} onSelect={onSelect} />
      ))}
    </>
  );
}

function MaintList({
  records,
  links,
  onSelect,
}: {
  records: MaintenanceRecord[];
  links: LinkBuilders;
  onSelect: (p: CardPreview) => void;
}) {
  return (
    <>
      {records.map((record) => (
        <MaintenanceCard
          key={`${record.item_id}-${record.record_id}`}
          record={record}
          href={links.maintHref(record)}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function CompletedDisclosure({
  completed,
  links,
  onSelect,
}: {
  completed: CompletedBucket;
  links: LinkBuilders;
  onSelect: (p: CardPreview) => void;
}) {
  const ideas = completed.ideas ?? [];
  const maint = [
    ...(completed.inspections ?? []),
    ...(completed.repairs ?? []),
    ...(completed.maintenance_tasks ?? []),
  ];
  const total = ideas.length + maint.length;
  if (total === 0) return null;

  return (
    <Accordion isCompact variant="light" className="px-0">
      <AccordionItem
        key="completed"
        aria-label="Completed items"
        title={
          <Typography type="body-sm" className="text-default-500">
            {total} completed
          </Typography>
        }
      >
        <div className="flex flex-col gap-2 pb-2">
          <IdeaList ideas={ideas} links={links} onSelect={onSelect} />
          <MaintList records={maint} links={links} onSelect={onSelect} />
        </div>
      </AccordionItem>
    </Accordion>
  );
}

export function SeasonColumn({
  def,
  bucket,
  links,
  onSelect,
  className = '',
}: {
  def: BucketDef;
  bucket: SeasonBucket;
  links: LinkBuilders;
  onSelect: (p: CardPreview) => void;
  className?: string;
}) {
  const activeCount = bucketActiveCount(bucket);

  return (
    <section className={`flex flex-col gap-4 rounded-large border border-default-200 bg-content1 p-4 ${className}`}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="dot" color={def.color}>
            {def.label}
          </Chip>
        </div>
        {activeCount > 0 && (
          <Chip size="sm" variant="flat" color="default">
            {activeCount}
          </Chip>
        )}
      </header>

      {activeCount === 0 ? (
        <Typography type="body-sm" className="py-6 text-center text-default-400">
          No active work this period
        </Typography>
      ) : (
        SECTIONS.map((section) => {
          const items = bucket[section.key] ?? [];
          return (
            <div key={section.key} className="flex flex-col gap-2">
              <Typography type="body-xs" className="font-semibold uppercase tracking-wide text-default-400">
                {section.label}
              </Typography>
              {items.length === 0 ? (
                <Typography type="body-xs" className="text-default-300">None</Typography>
              ) : section.key === 'ideas' ? (
                <IdeaList ideas={items as IdeaRecord[]} links={links} onSelect={onSelect} />
              ) : (
                <MaintList records={items as MaintenanceRecord[]} links={links} onSelect={onSelect} />
              )}
            </div>
          );
        })
      )}

      <CompletedDisclosure completed={bucket.completed ?? {}} links={links} onSelect={onSelect} />
    </section>
  );
}
