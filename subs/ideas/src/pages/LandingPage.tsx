// Landing hub — season cards (Considering+Planning counts) + action cards.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Chip } from '@heroui/react';
import { Plus, Hammer, Sparkles } from 'lucide-react';
import { PageHeader } from '@spookydecs/ui';
import { listIdeas } from '../api/ideasApi';
import { SEASONS } from '../config/ideasConfig';
import { SeasonChip } from '../components/chips';

interface Counts {
  active: Record<string, number | null>;
  workbench: Record<string, number>;
  workbenchTotal: number;
  planningTotal: number;
}

const EMPTY: Counts = {
  active: { Halloween: null, Christmas: null, Shared: null },
  workbench: { Halloween: 0, Christmas: 0, Shared: 0 },
  workbenchTotal: 0,
  planningTotal: 0,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>(EMPTY);

  useEffect(() => {
    listIdeas()
      .then((ideas) => {
        const next: Counts = {
          active: {},
          workbench: { Halloween: 0, Christmas: 0, Shared: 0 },
          workbenchTotal: 0,
          planningTotal: 0,
        };
        for (const s of SEASONS) {
          next.active[s] = ideas.filter(
            (i) => i.season === s && (i.status === 'Considering' || i.status === 'Planning'),
          ).length;
        }
        const wb = ideas.filter((i) => i.status === 'Workbench');
        for (const s of SEASONS) next.workbench[s] = wb.filter((i) => i.season === s).length;
        next.workbenchTotal = wb.length;
        next.planningTotal = ideas.filter((i) => i.status === 'Planning').length;
        setCounts(next);
      })
      .catch(() => setCounts(EMPTY));
  }, []);

  const { workbenchTotal: building, planningTotal: planning } = counts;
  const pipelineTotal = building + planning;
  let buildsDesc: string;
  if (building > 0 && planning > 0) {
    buildsDesc = `${building} building · ${planning} planning.`;
  } else if (building > 0) {
    buildsDesc = `${building} active build${building !== 1 ? 's' : ''} in progress.`;
  } else if (planning > 0) {
    buildsDesc = `${planning} idea${planning !== 1 ? 's' : ''} in planning.`;
  } else {
    buildsDesc = 'Nothing in the pipeline right now.';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader title="Ideas" subtitle="Browse, plan, and track decoration ideas by season." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SEASONS.map((season) => {
          const count = counts.active[season];
          const wb = counts.workbench[season];
          return (
            <Card
              key={season}
              isPressable
              onPress={() => navigate(`/list?season=${season}`)}
              className="h-full"
            >
              <CardBody className="gap-3">
                <SeasonChip season={season} />
                <h3 className="text-large font-semibold text-foreground">{season} Ideas</h3>
                <div className="flex items-center gap-2 text-small text-default-500">
                  <span>{count === null ? '—' : count} idea{count !== 1 ? 's' : ''}</span>
                  {wb > 0 && (
                    <Chip size="sm" variant="flat" color="warning">
                      {wb} in builds
                    </Chip>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}

        <ActionCard
          icon={<Plus size={20} />}
          label="New"
          title="Add Idea"
          desc="Capture a new decoration idea and start planning."
          onPress={() => navigate('/create')}
          accent
        />
        <ActionCard
          icon={<Hammer size={20} />}
          label="Build"
          title="Active Builds"
          desc={buildsDesc}
          badge={pipelineTotal > 0 ? pipelineTotal : undefined}
          onPress={() => navigate('/workbench')}
        />
        <ActionCard
          icon={<Sparkles size={20} />}
          label="Inspo"
          title="Inspirations"
          desc="Browse saved inspiration images and references."
          onPress={() => {}}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  title,
  desc,
  onPress,
  accent,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  desc: string;
  onPress: () => void;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <Card
      isPressable
      onPress={onPress}
      className={`h-full ${accent ? 'border-2 border-primary/40' : ''}`}
    >
      <CardBody className="gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-default-500">
            {icon}
            <span className="text-tiny font-semibold uppercase tracking-wide">{label}</span>
          </div>
          {badge != null && (
            <Chip size="sm" variant="flat" color="warning">
              {badge}
            </Chip>
          )}
        </div>
        <h3 className="text-large font-semibold text-foreground">{title}</h3>
        <p className="text-small text-default-500">{desc}</p>
      </CardBody>
    </Card>
  );
}
