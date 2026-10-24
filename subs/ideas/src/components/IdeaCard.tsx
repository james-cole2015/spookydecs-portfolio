// IdeaCard — a single idea tile in the season list grid.
import { Card, CardBody, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { SeasonChip, StatusChip } from './chips';
import { PIPELINE_STAGES, SEASON_PLACEHOLDERS, TERMINAL_STATUSES, type Idea } from '../config/ideasConfig';
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

// Card progress positions, aligned to the status pipeline (Considering →
// Planning → Workbench → Built maps onto Idea → Prep → Build → Complete).
const STAGE_LABELS = ['Idea', 'Prep', 'Build', 'Complete'];

// Progress = the furthest of the status baseline and any filled date milestone,
// so a Workbench idea reflects "Build" even before prep/build dates are set.
function ProgressStrip({ idea }: { idea: Idea }) {
  const statusIdx = PIPELINE_STAGES.indexOf(idea.status);
  const dateIdx = idea.build_complete ? 3 : idea.build_start ? 2 : idea.prep_start ? 1 : 0;
  const activeThrough = Math.max(statusIdx, dateIdx, 0);
  return (
    <div className="flex items-center gap-1">
      {STAGE_LABELS.map((label, i) => (
        <div
          key={label}
          className={`flex-1 rounded-full px-2 py-1 text-center text-tiny ${
            i <= activeThrough ? 'bg-primary/20 text-primary' : 'bg-default-100 text-default-400'
          }`}
        >
          {label}
        </div>
      ))}
    </div>
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
        {idea.status === 'Workbench' && <ProgressStrip idea={idea} />}
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
