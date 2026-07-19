// Season list — FilterBar + card grid; filter/sort state lives in the URL.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeft, Plus } from 'lucide-react';
import { LoadingState, ErrorState, EmptyState, FilterBar } from '@spookydecs/ui';
import { listIdeas } from '../api/ideasApi';
import {
  HIDDEN_FROM_LIST,
  FILTER_SELECT_KEYS,
  FILTER_OPTIONS,
  FILTER_LABELS,
  type Idea,
} from '../config/ideasConfig';
import { IdeaCard } from '../components/IdeaCard';

export default function ListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState('');

  const season = params.get('season') || 'Halloween';
  const status = params.get('status') || 'all';
  const sort = params.get('sort') || 'newest';
  const search = params.get('search') || '';

  useEffect(() => {
    setIdeas(null);
    setError('');
    listIdeas()
      .then(setIdeas)
      .catch((err) => setError((err as Error).message));
  }, []);

  function patch(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      // Drop default values so the URL stays clean (matches the vanilla state manager).
      if (!v || (k === 'status' && v === 'all') || (k === 'sort' && v === 'newest')) merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged, { replace: true });
  }

  const filtered = useMemo(() => {
    if (!ideas) return [];
    const q = search.toLowerCase();
    const out = ideas.filter((idea) => {
      if (HIDDEN_FROM_LIST.has(idea.status)) return false;
      if (idea.season !== season) return false;
      if (status !== 'all' && idea.status !== status) return false;
      if (q) {
        const inTitle = (idea.title || '').toLowerCase().includes(q);
        const inDesc = (idea.description || '').toLowerCase().includes(q);
        const inTags = (idea.tags || []).some((t) => t.toLowerCase().includes(q));
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
  }, [ideas, season, status, sort, search]);

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
        filters={{ status, sort, search }}
        show={FILTER_SELECT_KEYS}
        options={FILTER_OPTIONS}
        labels={FILTER_LABELS}
        onChange={patch}
        searchPlaceholder="Search title, tags…"
        searchDebounceMs={300}
        resultCount={filtered.length}
        resultNoun="idea"
      />

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : ideas === null ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No ideas found"
            message="Try adjusting your filters or add a new idea."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </div>

      <Button
        isIconOnly
        color="primary"
        radius="full"
        size="lg"
        aria-label="Add idea"
        onPress={() => navigate('/create')}
        className="fixed bottom-6 right-6 z-20 shadow-lg"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
}
