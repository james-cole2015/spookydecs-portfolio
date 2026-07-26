// Acquisitions browse — FilterBar + card grid; filter/sort state lives in the URL.
// Forks ListPage, but the status filter drives terminal visibility directly:
// default `active` hides Purchased+Passed, an explicit status reveals one, `all`
// shows everything. (Ideas always-hides terminal statuses; acquisitions must be
// able to reveal them via the filter — the crux difference from ideas.)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeft, Plus } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState, FilterBar } from '@spookydecs/ui';
import { listAcquisitions } from '../api/acquisitionsApi';
import {
  TERMINAL_STATUSES,
  FILTER_SELECT_KEYS,
  FILTER_OPTIONS,
  FILTER_LABELS,
  type Acquisition,
  type AcquisitionStatus,
} from '../config/acquisitionsConfig';
import { AcquisitionCard } from '../components/AcquisitionCard';

export default function AcquisitionsListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [acquisitions, setAcquisitions] = useState<Acquisition[] | null>(null);
  const [error, setError] = useState('');

  const season = params.get('season') || 'all';
  const status = params.get('status') || 'active';
  const sort = params.get('sort') || 'newest';
  const search = params.get('search') || '';

  useEffect(() => {
    setAcquisitions(null);
    setError('');
    listAcquisitions()
      .then(setAcquisitions)
      .catch((err) => setError((err as Error).message));
  }, []);

  function patch(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      // Drop default sentinels so the URL stays clean.
      if (
        !v ||
        (k === 'season' && v === 'all') ||
        (k === 'status' && v === 'active') ||
        (k === 'sort' && v === 'newest')
      )
        merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged, { replace: true });
  }

  const filtered = useMemo(() => {
    if (!acquisitions) return [];
    const q = search.toLowerCase();
    const out = acquisitions.filter((a) => {
      if (season !== 'all' && a.season !== season) return false;
      if (status === 'active') {
        if (TERMINAL_STATUSES.has(a.status)) return false; // hide Purchased + Passed
      } else if (status !== 'all' && a.status !== (status as AcquisitionStatus)) {
        return false; // reveal a specific status
      }
      // status === 'all' → show everything, including terminal
      if (q) {
        const inTitle = (a.title || '').toLowerCase().includes(q);
        const inDesc = (a.description || '').toLowerCase().includes(q);
        const inTags = (a.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      if (sort === 'oldest') return +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0);
      if (sort === 'az') return (a.title || '').localeCompare(b.title || '');
      return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0);
    });
    return out;
  }, [acquisitions, season, status, sort, search]);

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

      <FilterBar
        filters={{ season, status, sort, search }}
        show={FILTER_SELECT_KEYS}
        options={FILTER_OPTIONS}
        labels={FILTER_LABELS}
        onChange={patch}
        searchPlaceholder="Search title, tags…"
        searchDebounceMs={300}
        resultCount={filtered.length}
        resultNoun="acquisition"
      />

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : acquisitions === null ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No acquisitions found"
            message="Try adjusting your filters or add a new acquisition."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((a) => (
              <AcquisitionCard key={a.acquisition_id} acquisition={a} />
            ))}
          </div>
        )}
      </div>

      <Button
        isIconOnly
        color="primary"
        radius="full"
        size="lg"
        aria-label="Add acquisition"
        onPress={() => navigate('/acquisitions/create')}
        className="fixed bottom-6 right-6 z-20 shadow-lg"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
}
