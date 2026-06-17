// IdeaCard — a single idea tile in the season list grid.
import { Card, CardBody, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { SeasonChip, StatusChip } from './chips';
import { SEASON_PLACEHOLDERS, TERMINAL_STATUSES, type Idea } from '../config/ideasConfig';
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

export function IdeaCard({ idea }: { idea: Idea }) {
  const navigate = useNavigate();
  const muted = TERMINAL_STATUSES.has(idea.status);
  const img = heroImageUrl(idea.images, idea.link);
  const tags = idea.tags || [];
  const visibleTags = tags.slice(0, 3);
  const extra = tags.length - visibleTags.length;

  return (
    <Card
      isPressable
      onPress={() => navigate(`/${idea.id}`)}
      className={`h-full ${muted ? 'opacity-60' : ''}`}
    >
      <div className="aspect-video w-full overflow-hidden bg-default-100">
        {img ? (
          <img src={img} alt={idea.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Placeholder season={idea.season} />
        )}
      </div>
      <CardBody className="gap-2">
        <div className="flex flex-wrap gap-1.5">
          <SeasonChip season={idea.season} />
          <StatusChip status={idea.status} />
        </div>
        <h3 className="line-clamp-1 text-medium font-semibold text-foreground">{idea.title}</h3>
        {idea.description && (
          <p className="line-clamp-2 text-small text-default-500">{idea.description}</p>
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
