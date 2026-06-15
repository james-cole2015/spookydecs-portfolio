/**
 * System Map — the grid of sub tiles below the dashboard. Ported from the vanilla
 * components/SystemMap.js. External tiles link to each sub's URL (resolved from
 * config); the Iris-admin tile navigates internally; items carries live stats.
 * Placeholder/Coming-Soon tiles (audit, or any sub with no URL) are dimmed.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, CardHeader } from '@heroui/react';
import { calculateSystemHealth, fetchSubStats, getSubdomainUrls } from '../api/adminApi';
import {
  SUBDOMAINS,
  type SubStats,
  type Subdomain,
  type SubdomainUrls,
  type SystemHealth,
} from '../config/adminConfig';

export function SystemMap() {
  const navigate = useNavigate();
  const [urls, setUrls] = useState<SubdomainUrls | null>(null);
  const [, setHealth] = useState<SystemHealth>({});
  const [stats, setStats] = useState<Record<string, SubStats>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [healthData, urlData] = await Promise.all([
          calculateSystemHealth(),
          getSubdomainUrls(),
        ]);
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

  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold text-foreground">System Map</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBDOMAINS.map((sub) => (
          <SystemCard
            key={sub.id}
            sub={sub}
            url={sub.urlKey ? urls?.[sub.urlKey] || '' : ''}
            stats={sub.statsKey ? stats[sub.statsKey] : undefined}
            onInternalNavigate={navigate}
          />
        ))}
      </div>
    </section>
  );
}

function SystemCard({
  sub,
  url,
  stats,
  onInternalNavigate,
}: {
  sub: Subdomain;
  url: string;
  stats?: SubStats;
  onInternalNavigate: (route: string) => void;
}) {
  const isInternal = !!sub.internalRoute;
  const isPlaceholder = !isInternal && (sub.placeholder || !url);

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
        {isInternal ? (
          <Button
            color="secondary"
            variant="flat"
            size="sm"
            fullWidth
            onPress={() => onInternalNavigate(sub.internalRoute as string)}
          >
            Open {sub.title} →
          </Button>
        ) : isPlaceholder ? (
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
