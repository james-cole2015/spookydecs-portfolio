// Workbench — grid of active (status=Workbench) builds with a progress indicator.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState, PageHeader } from '@spookydecs/ui';
import { listIdeas } from '../api/ideasApi';
import { PIPELINE_STAGES, type Idea } from '../config/ideasConfig';
import { SeasonChip } from '../components/chips';
import { formatDate } from '../lib/format';

// Card progress positions, aligned to the status pipeline (Considering →
// Planning → Workbench → Built maps onto Idea → Prep → Build → Complete).
const STAGE_LABELS = ['Idea', 'Prep', 'Build', 'Complete'];

export default function WorkbenchPage() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listIdeas()
      .then(setIdeas)
      .catch((err) => setError((err as Error).message));
  }, []);

  // Planning ideas are queued (not yet a build) and open the detail page where
  // "Move to Workbench" lives; Workbench ideas are in-progress and open the
  // build workspace.
  const planning = ideas?.filter((i) => i.status === 'Planning') ?? [];
  const builds = ideas?.filter((i) => i.status === 'Workbench') ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Button
        variant="light"
        size="sm"
        startContent={<ArrowLeft size={16} />}
        onPress={() => navigate('/')}
        className="mb-4"
      >
        Back
      </Button>
      <PageHeader title="Active Builds" subtitle="Ideas in planning and active build." />

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : ideas === null ? (
        <LoadingState />
      ) : planning.length === 0 && builds.length === 0 ? (
        <EmptyState
          icon="🔨"
          title="Nothing in the pipeline"
          message="Move an idea to Planning or the Workbench to start tracking it here."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {builds.length > 0 && (
            <BuildSection
              title="In Build"
              subtitle="Active builds in the workshop."
              ideas={builds}
              onOpen={(idea) => navigate(`/workbench/${idea.id}`)}
            />
          )}
          {planning.length > 0 && (
            <BuildSection
              title="Planning"
              subtitle="Queued ideas not yet moved into the workshop."
              ideas={planning}
              onOpen={(idea) => navigate(`/${idea.id}`)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function BuildSection({
  title,
  subtitle,
  ideas,
  onOpen,
}: {
  title: string;
  subtitle: string;
  ideas: Idea[];
  onOpen: (idea: Idea) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-medium font-semibold text-foreground">
          {title}
          <span className="ml-2 text-small font-normal text-default-400">({ideas.length})</span>
        </h2>
        <p className="text-small text-default-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => (
          <BuildCard key={idea.id} idea={idea} onOpen={() => onOpen(idea)} />
        ))}
      </div>
    </section>
  );
}

function BuildCard({ idea, onOpen }: { idea: Idea; onOpen: () => void }) {
  // Progress = the furthest of the status baseline and any filled date milestone,
  // so a Workbench idea reflects "Build" even before prep/build dates are set.
  const statusIdx = PIPELINE_STAGES.indexOf(idea.status);
  const dateIdx = idea.build_complete ? 3 : idea.build_start ? 2 : idea.prep_start ? 1 : 0;
  const activeThrough = Math.max(statusIdx, dateIdx, 0);
  const materialsCount = (idea.materials || []).length;

  return (
    <Card isPressable onPress={onOpen} className="h-full">
      <CardBody className="gap-3">
        <div className="flex items-center gap-2">
          <SeasonChip season={idea.season} />
          <h3 className="line-clamp-1 text-medium font-semibold text-foreground">{idea.title}</h3>
        </div>

        <div className="flex items-center gap-1">
          {STAGE_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div
                className={`flex-1 rounded-full px-2 py-1 text-center text-tiny ${
                  i <= activeThrough
                    ? 'bg-primary/20 text-primary'
                    : 'bg-default-100 text-default-400'
                }`}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 text-tiny text-default-500">
          {idea.estimated_cost != null && (
            <span>Est. Cost: ${Number(idea.estimated_cost).toFixed(2)}</span>
          )}
          {idea.prep_start && <span>Prep Start: {formatDate(idea.prep_start)}</span>}
          {idea.build_start && <span>Build Start: {formatDate(idea.build_start)}</span>}
          {materialsCount > 0 && (
            <span>
              Materials: {materialsCount} item{materialsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {idea.description && (
          <p className="line-clamp-2 text-small text-default-500">{idea.description}</p>
        )}
      </CardBody>
    </Card>
  );
}
