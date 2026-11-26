/**
 * System Map — the grid of sub tiles below the dashboard. Ported from the vanilla
 * components/SystemMap.js. External tiles link to each sub's URL (resolved from
 * config); the Iris-admin tile navigates internally; items carries live stats.
 * Placeholder/Coming-Soon tiles (audit, or any sub with no URL) are dimmed.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import { Typography, isDemoEnv } from '@spookydecs/ui';
import { Camera, ClipboardCheck, PlugZap, Search, type LucideIcon } from 'lucide-react';
import { calculateSystemHealth, fetchSubStats, getSubdomainUrls } from '../api/adminApi';
import {
  SUBDOMAINS,
  type SubStats,
  type Subdomain,
  type SubdomainUrls,
  type SystemHealth,
} from '../config/adminConfig';
import { overallStatus } from '../config/validationRegistry';

export function SystemMap() {
  const navigate = useNavigate();
  const [urls, setUrls] = useState<SubdomainUrls | null>(null);
  const [, setHealth] = useState<SystemHealth>({});
  const [stats, setStats] = useState<Record<string, SubStats>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [healthData, urlData] = await Promise.all([calculateSystemHealth(), getSubdomainUrls()]);
        if (cancelled) return;
        setHealth(healthData);
        setUrls(urlData);

        // Fan out to /stats/{key} for every tile that declares a statsKey.
        const withStats = SUBDOMAINS.filter((s) => s.statsKey);
        const results = await Promise.all(
          withStats.map(async (s) => [s.statsKey as string, await fetchSubStats(s.statsKey as string)] as const),
        );
        if (cancelled) return;
        const next: Record<string, SubStats> = {};
        for (const [key, data] of results) {
          if (data) next[key] = data;
        }
        setStats(next);
      } catch (err) {
        console.error('Failed to load system data:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tools = SUBDOMAINS.filter((s) => s.kind === 'tool' && !(s.id === 'validation' && isDemoEnv()));
  const subs = SUBDOMAINS.filter((s) => s.kind === 'sub');

  return (
    <>
      <section className="mt-6">
        <Typography type="h4" className="mb-4">
          Tools
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onNavigate={navigate} />
          ))}
        </div>
      </section>
      <section className="mt-8">
        <Typography type="h4" className="mb-4">
          System Map
        </Typography>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((sub) => (
            <SystemCard
              key={sub.id}
              sub={sub}
              url={sub.urlKey ? urls?.[sub.urlKey] || '' : ''}
              stats={sub.statsKey ? stats[sub.statsKey] : undefined}
            />
          ))}
        </div>
      </section>
    </>
  );
}

const TOOL_ICONS: Record<string, LucideIcon> = {
  validation: ClipboardCheck,
  'place-photo': Camera,
  'iris-admin': Search,
  'add-outlet': PlugZap,
};

function ToolCard({ tool, onNavigate }: { tool: Subdomain; onNavigate: (route: string) => void }) {
  const Icon = TOOL_ICONS[tool.id] ?? PlugZap;
  return (
    <Card
      isPressable
      onPress={() => onNavigate(tool.internalRoute as string)}
      shadow="none"
      className="border-l-4 border-default-300 bg-content2"
    >
      <CardBody className="flex flex-row items-center gap-3 py-3">
        <Icon size={20} className="shrink-0 text-secondary" aria-hidden />
        <div className="min-w-0 text-left">
          <p className="text-small font-semibold text-foreground">{tool.title}</p>
          <p className="line-clamp-2 text-tiny text-default-500">{tool.description}</p>
        </div>
        {tool.id === 'validation' && <ValidationStatus />}
      </CardBody>
    </Card>
  );
}

/** Pass/fail roll-up for the Run Validation tool. Status chip color follows §5 (success/warning). */
function ValidationStatus() {
  const { passing, total, latest } = overallStatus();
  return (
    <Chip
      size="sm"
      variant="flat"
      color={passing === total ? 'success' : 'warning'}
      className="ml-auto shrink-0"
      title={`Last run ${latest}`}
    >
      {passing}/{total} passing
    </Chip>
  );
}

function SystemCard({ sub, url, stats }: { sub: Subdomain; url: string; stats?: SubStats }) {
  const isPlaceholder = sub.placeholder || !url;

  // h-full + the grid's default stretch makes every card in a row equal height;
  // CardBody grows and the CardFooter button pins to the bottom regardless of how
  // long the description runs.
  return (
    <Card shadow="md" className={`h-full bg-content1 ${isPlaceholder ? 'opacity-60' : ''}`}>
      <CardHeader>
        <h3 className="text-medium font-semibold text-foreground">{sub.title}</h3>
      </CardHeader>
      <CardBody className="grow gap-3">
        <p className="text-small text-default-500">{sub.description}</p>
        {stats && stats.total_items !== undefined && (
          <p className="text-small text-default-600">{stats.total_items} total items</p>
        )}
      </CardBody>
      <CardFooter>
        {isPlaceholder ? (
          <Button variant="flat" size="sm" fullWidth isDisabled>
            Coming Soon
          </Button>
        ) : (
          <Button
            as="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            color="secondary"
            variant="flat"
            size="sm"
            fullWidth
          >
            View {sub.title} →
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
