// Landing hub — Items + Create Item, plus a real Maintenance count and an
// inert Inventory & Stock Stats placeholder, woven into each card's
// description. Card anatomy mirrors the storage sub's hub (icon badge +
// CardHeader/CardBody) — the fleet's canonical landing-page pattern.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '@heroui/react';
import { Boxes, Plus, Wrench, BarChart3, type LucideIcon } from 'lucide-react';
import { PageHeader, ErrorState, Typography } from '@spookydecs/ui';
import { fetchAllItems } from '../api/itemsApi';
import { CLASS_HIERARCHY } from '../config/itemsConfig';

interface Counts {
  total: number;
  byClass: Record<string, number>;
  flagged: number;
}

const EMPTY: Counts = { total: 0, byClass: {}, flagged: 0 };

interface HubCard {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    fetchAllItems(true)
      .then((items) => {
        const byClass: Record<string, number> = {};
        for (const cls of Object.keys(CLASS_HIERARCHY)) {
          byClass[cls] = items.filter((i) => i.class === cls).length;
        }
        const flagged = items.filter(
          (i) => i.maintenance?.repair_data?.needs_repair || i.operational_status === false,
        ).length;
        setCounts({ total: items.length, byClass, flagged });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load items.'));
  };

  useEffect(load, []);

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const classBreakdown = Object.keys(CLASS_HIERARCHY)
    .map((cls) => `${counts.byClass[cls] ?? 0} ${cls}`)
    .join(' · ');

  const CARDS: HubCard[] = [
    {
      id: 'items',
      icon: Boxes,
      title: 'Items',
      description: `${counts.total} total item${counts.total !== 1 ? 's' : ''} — ${classBreakdown}.`,
      route: '/items',
    },
    {
      id: 'create',
      icon: Plus,
      title: 'Create Item',
      description: 'Add a new item to the inventory.',
      route: '/create',
    },
    {
      id: 'maintenance',
      icon: Wrench,
      title: 'Maintenance & Repairs',
      description:
        counts.flagged > 0
          ? `${counts.flagged} item${counts.flagged !== 1 ? 's' : ''} currently flagged for inspection or repair.`
          : 'No items currently flagged for inspection or repair.',
      route: '/items?maintenance=needs_repair',
    },
    {
      id: 'stats',
      icon: BarChart3,
      title: 'Inventory & Stock Stats',
      description: 'Coming soon — counts and breakdowns across class, season, and status.',
      route: '',
    },
  ];

  return (
    <div>
      <PageHeader title="Items" subtitle="Manage decorations, lights, and accessories across all seasons." />
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Card
            key={card.id}
            isPressable={!!card.route}
            isHoverable={!!card.route}
            shadow="md"
            onPress={card.route ? () => navigate(card.route) : undefined}
            className="bg-content1"
          >
            <CardHeader className="flex items-center gap-3 pb-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <card.icon size={22} />
              </span>
              <Typography type="h5" className="text-foreground">{card.title}</Typography>
            </CardHeader>
            <CardBody>
              <Typography type="body-sm" className="text-default-500">{card.description}</Typography>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
