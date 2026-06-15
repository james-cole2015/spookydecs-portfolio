/**
 * Iris Search Text manager — port of pages/search-text.js. Lets staff tune an
 * item's `search_text` (the source for Iris text embeddings) and trigger the two
 * vector index rebuilds (Iris text + Gallery image). Debounced search, a result
 * sidebar, and an inline editor. Reindex/save feedback via toast + inline status.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Chip,
  Input,
  Spinner,
  Textarea,
} from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, useConfig, useToast } from '@spookydecs/ui';
import {
  getItemSearchText,
  searchItems,
  triggerReindex,
  updateItemSearchText,
} from '../api/adminApi';
import type { ItemSearchText, SearchItem } from '../config/adminConfig';

type ReindexKind = 'text' | 'images';

export default function SearchTextPage() {
  const navigate = useNavigate();
  const config = useConfig();
  const toast = useToast();
  const itemsBaseUrl = (config.INV_ADMIN_URL as string) || '';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [item, setItem] = useState<ItemSearchText | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [saving, setSaving] = useState(false);

  const [reindexing, setReindexing] = useState<ReindexKind | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search (300ms), mirroring the vanilla page.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const items = await searchItems(q);
        setResults(items || []);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function loadItem(itemId: string) {
    setActiveId(itemId);
    setItemLoading(true);
    setItem(null);
    try {
      const loaded = await getItemSearchText(itemId);
      if (loaded) {
        setItem(loaded);
        setSearchText(loaded.search_text || '');
      }
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setItemLoading(false);
    }
  }

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      await updateItemSearchText(item.item_id, searchText);
      toast.showSuccess('Search text saved.');
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function reindex(kind: ReindexKind) {
    setReindexing(kind);
    try {
      const result = await triggerReindex(kind);
      if (result) {
        const msg =
          kind === 'text'
            ? `${result.iris_text_indexed_count} items indexed.`
            : `${result.gallery_indexed_count} items indexed (${result.image_embedded_count} image, ${result.text_embedded_count} text).`;
        toast.showSuccess(msg);
      }
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Reindex failed');
    } finally {
      setReindexing(null);
    }
  }

  const itemUrl = item && itemsBaseUrl ? `${itemsBaseUrl}/${encodeURIComponent(item.item_id)}` : null;

  return (
    <div>
      <PageHeader
        title="Iris Search Text"
        subtitle="Manage vector indexes for Iris semantic search and gallery AI tagging. Edit an item's search text to tune how Iris finds and understands it."
        actions={
          <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/admin')}>
            Back to Dashboard
          </Button>
        }
      />

      {/* Reindex cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReindexCard
          label="Iris"
          description="Generates text embeddings from search_text for Iris semantic search. Fast."
          busy={reindexing === 'text'}
          onRebuild={() => reindex('text')}
        />
        <ReindexCard
          label="Gallery"
          description="Generates image embeddings from catalog photos for AI tag suggestions. May take a minute."
          busy={reindexing === 'images'}
          onRebuild={() => reindex('images')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Search sidebar */}
        <div className="md:col-span-1">
          <Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search items..."
            autoComplete="off"
            isClearable
            onClear={() => setQuery('')}
          />
          <div className="mt-3 flex flex-col gap-2">
            {searching && (
              <div className="flex items-center gap-2 text-small text-default-500">
                <Spinner size="sm" /> Searching…
              </div>
            )}
            {searchError && <div className="text-small text-danger">Search failed: {searchError}</div>}
            {!searching && !searchError && query.trim() && results.length === 0 && (
              <div className="text-small text-default-500">No items found.</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => loadItem(r.id)}
                className={`flex flex-col rounded-large px-3 py-2 text-left transition-colors ${
                  activeId === r.id ? 'bg-secondary/20' : 'bg-content2 hover:bg-content3'
                }`}
              >
                <span className="text-small font-medium text-foreground">{r.short_name || r.id}</span>
                <span className="text-tiny text-default-400">{r.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-2">
          <Card shadow="md" className="bg-content1">
            <CardBody className="gap-4">
              {itemLoading ? (
                <div className="flex items-center gap-2 py-8 text-default-500">
                  <Spinner size="sm" /> Loading item…
                </div>
              ) : !item ? (
                <div className="py-8 text-center text-default-500">
                  Select an item to edit its search text.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip variant="flat" color="secondary">
                      {item.item_id}
                    </Chip>
                    <span className="font-medium text-foreground">{item.short_name}</span>
                    {item.season && (
                      <Chip variant="bordered" size="sm">
                        {item.season}
                      </Chip>
                    )}
                    {itemUrl && (
                      <a
                        href={itemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-small text-secondary"
                      >
                        View item →
                      </a>
                    )}
                  </div>
                  <Textarea
                    label="search_text"
                    value={searchText}
                    onValueChange={setSearchText}
                    minRows={6}
                  />
                </>
              )}
            </CardBody>
            {item && !itemLoading && (
              <CardFooter>
                <Button color="secondary" onPress={save} isLoading={saving}>
                  Save
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReindexCard({
  label,
  description,
  busy,
  onRebuild,
}: {
  label: string;
  description: string;
  busy: boolean;
  onRebuild: () => void;
}) {
  return (
    <Card shadow="sm" className="bg-content1">
      <CardBody>
        <div className="font-semibold text-foreground">{label}</div>
        <p className="mt-1 text-small text-default-500">{description}</p>
      </CardBody>
      <CardFooter>
        <Button color="primary" variant="flat" size="sm" onPress={onRebuild} isLoading={busy}>
          Rebuild
        </Button>
      </CardFooter>
    </Card>
  );
}
