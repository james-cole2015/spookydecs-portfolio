// AcquisitionCard — a single acquisition tile in the browse grid.
// Forks IdeaCard, but consumes the canonical shared @spookydecs/ui chips
// (StatusChip + colorMap / SeasonChip) rather than the ideas-local chips.tsx.
import { Card, CardBody, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { SeasonChip, StatusChip } from '@spookydecs/ui';
import {
  ACQ_STATUS_COLOR,
  SEASON_PLACEHOLDERS,
  TERMINAL_STATUSES,
  type Acquisition,
} from '../config/acquisitionsConfig';
import { heroImageUrl } from '../lib/format';

function Placeholder({ season }: { season: string }) {
  const key = (season || 'shared').toLowerCase();
  const svg = SEASON_PLACEHOLDERS[key] || SEASON_PLACEHOLDERS.shared;
  return (
    <div
      className="flex h-full w-full items-center justify-center p-8 text-default-300 [&_svg]:h-16 [&_svg]:w-16"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function AcquisitionCard({ acquisition }: { acquisition: Acquisition }) {
  const navigate = useNavigate();
  const a = acquisition;
  const muted = TERMINAL_STATUSES.has(a.status);
  const img = heroImageUrl(a.image ? [a.image] : undefined, a.url);
  const tags = a.tags || [];
  const visibleTags = tags.slice(0, 3);
  const extra = tags.length - visibleTags.length;

  return (
    <Card
      isPressable
      onPress={() => navigate(`/acquisitions/${a.acquisition_id}`)}
      className={`h-full ${muted ? 'opacity-60' : ''}`}
    >
      <div className="aspect-video w-full overflow-hidden bg-default-100">
        {img ? (
          <img src={img} alt={a.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Placeholder season={a.season} />
        )}
      </div>
      <CardBody className="gap-2">
        <div className="flex flex-wrap gap-1.5">
          <SeasonChip value={a.season} />
          <StatusChip value={a.status} colorMap={ACQ_STATUS_COLOR} />
        </div>
        <h3 className="line-clamp-1 text-medium font-semibold text-foreground">{a.title}</h3>
        {a.description && (
          <p className="line-clamp-2 text-small text-default-500">{a.description}</p>
        )}
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {visibleTags.map((t) => (
              <Chip key={t} size="sm" variant="flat" className="text-tiny">
                {t}
              </Chip>
            ))}
            {extra > 0 && (
              <Chip size="sm" variant="flat" className="text-tiny">
                +{extra}
              </Chip>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
