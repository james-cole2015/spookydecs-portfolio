/**
 * Gallery manager — typed HeroUI port of js/pages/gallery-manager.js (#336).
 * Section tabs (showcase/progress/community), season/year/tag filters, stats,
 * and a curation grid (featured/sort/delete). Upload goes through the shared
 * usePhotoUpload (#380) hook (no direct CDN upload-element mount) — preceded by a
 * season/year prompt and followed by an optional display-name/location step.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
} from '@heroui/react';
import {
  Breadcrumbs,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  useToast,
  usePhotoUpload,
  type UploadedPhoto,
  ConfirmDialog,
} from '@spookydecs/ui';
import { deleteImage, fetchImages, patchImage, updateImage } from '../api/imagesApi';
import { IMAGES_CONFIG, type GalleryData, type Photo } from '../config/imagesConfig';
import { GalleryPhotoCard } from '../components/GalleryPhotoCard';

type Section = 'showcase' | 'progress' | 'community';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'showcase', label: '🎨 Showcase' },
  { id: 'progress', label: '🔨 Progress' },
  { id: 'community', label: '👥 Community' },
];

const LOCATION_OPTIONS = ['Front Yard', 'Side Yard', 'Back Yard'];

function yearOptions(): string[] {
  const current = new Date().getFullYear();
  const out: string[] = [];
  for (let y = current; y >= 2020; y--) out.push(String(y));
  return out;
}

function sortGallery(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    const ag = a.gallery_data || {};
    const bg = b.gallery_data || {};
    if (ag.is_featured && !bg.is_featured) return -1;
    if (!ag.is_featured && bg.is_featured) return 1;
    const as = ag.sort_order ?? 999;
    const bs = bg.sort_order ?? 999;
    if (as !== bs) return as - bs;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

export default function GalleryManager() {
  const navigate = useNavigate();
  const toast = useToast();
  const { openWithEditor, editor } = usePhotoUpload();

  const [section, setSection] = useState<Section>('showcase');
  const [season, setSeason] = useState('');
  const [year, setYear] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pre-upload (season/year) prompt state.
  const [uploadPromptOpen, setUploadPromptOpen] = useState(false);
  const [promptSeason, setPromptSeason] = useState('');
  const [promptYear, setPromptYear] = useState(String(new Date().getFullYear()));
  // Gallery uploads default Private; the switch opts a photo into the public gallery site.
  const [promptPublic, setPromptPublic] = useState(false);

  // Post-upload (display name / location) step state.
  const [postUpload, setPostUpload] = useState<UploadedPhoto[] | null>(null);
  const postMetaRef = useRef<Record<string, { display_name: string; location: string }>>({});

  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const photoType = IMAGES_CONFIG.CATEGORIES[`gallery_${section}`]?.photoType;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = { photo_type: photoType };
      if (season) filters.season = season;
      if (year) filters.year = year;
      if (tags.length) filters.tags = tags.join(',');
      const result = await fetchImages(filters);
      setPhotos(sortGallery(result));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load photos');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoType, season, year, tags]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: photos.length,
      featured: photos.filter((p) => p.gallery_data?.is_featured).length,
      public: photos.filter((p) => p.is_public).length,
    }),
    [photos],
  );

  function addTag() {
    const value = tagInput.trim().replace(/,$/, '').trim().toLowerCase();
    if (value && !tags.includes(value)) setTags((t) => [...t, value]);
    setTagInput('');
  }

  async function handleUpdate(photoId: string, updates: { gallery_data: GalleryData }) {
    try {
      await patchImage(photoId, updates);
      await load();
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to update photo');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteImage(deleteTarget.photo_id);
      toast.showSuccess('Image deleted');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to delete photo');
    } finally {
      setDeleting(false);
    }
  }

  // Step 1: season/year prompt. Step 2: shared upload modal. Step 3: per-photo metadata.
  async function startUpload() {
    if (!promptSeason) return;
    setUploadPromptOpen(false);
    const sectionConfig = IMAGES_CONFIG.CATEGORIES[`gallery_${section}`];
    try {
      const uploaded = await openWithEditor({
        context: 'gallery',
        photo_type: sectionConfig.photoType,
        category: `gallery_${section}`,
        season: promptSeason,
        year: parseInt(promptYear, 10) || new Date().getFullYear(),
        isPublic: promptPublic,
      });
      if (uploaded.length > 0) {
        toast.showSuccess(`${uploaded.length} photo(s) uploaded`);
        postMetaRef.current = {};
        setPostUpload(uploaded);
      }
    } catch (e: any) {
      toast.showError(e?.message ?? 'Could not upload photos');
    }
  }

  async function savePostUpload() {
    const uploaded = postUpload ?? [];
    const writes = uploaded
      .map((p) => {
        const meta = postMetaRef.current[p.photo_id];
        if (!meta || (!meta.display_name && !meta.location)) return null;
        return updateImage(p.photo_id, {
          gallery_data: { display_name: meta.display_name, location: meta.location },
        });
      })
      .filter(Boolean) as Promise<unknown>[];
    if (writes.length) await Promise.all(writes);
    setPostUpload(null);
    await load();
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Images', to: '/images' }, { label: 'Gallery Manager' }]} />
      <PageHeader
        title="Gallery Management"
        actions={
          <>
            <Button
              color="primary"
              onPress={() => {
                setPromptSeason(season || '');
                setPromptYear(year || String(new Date().getFullYear()));
                setPromptPublic(false);
                setUploadPromptOpen(true);
              }}
            >
              Upload Photo
            </Button>
            <Button variant="flat" onPress={() => navigate('/images/list')}>
              ← Back to Admin
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Button
            key={s.id}
            variant={section === s.id ? 'solid' : 'flat'}
            color={section === s.id ? 'secondary' : 'default'}
            onPress={() => setSection(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label="Season"
          size="sm"
          className="max-w-[180px]"
          selectedKeys={[season]}
          onChange={(e) => setSeason(e.target.value)}
        >
          <>
            <SelectItem key="">All Seasons</SelectItem>
            {IMAGES_CONFIG.SEASONS.map((s) => (
              <SelectItem key={s.value}>{s.label}</SelectItem>
            ))}
          </>
        </Select>
        <Select
          label="Year"
          size="sm"
          className="max-w-[160px]"
          selectedKeys={[year]}
          onChange={(e) => setYear(e.target.value)}
        >
          <>
            <SelectItem key="">All Years</SelectItem>
            {yearOptions().map((y) => (
              <SelectItem key={y}>{y}</SelectItem>
            ))}
          </>
        </Select>
        <Input
          label="Tags"
          size="sm"
          className="max-w-[220px]"
          placeholder="Type tag + Enter"
          value={tagInput}
          onValueChange={setTagInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button
          size="sm"
          variant="flat"
          onPress={() => {
            setSeason('');
            setYear('');
            setTags([]);
          }}
        >
          Clear Filters
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Chip key={tag} onClose={() => setTags((t) => t.filter((x) => x !== tag))} variant="flat">
              {tag}
            </Chip>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Total Photos', value: stats.total },
          { label: 'Featured', value: stats.featured },
          { label: 'Public', value: stats.public },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">{s.value}</div>
            <div className="text-tiny text-default-500">{s.label}</div>
          </Card>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading photos…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : photos.length === 0 ? (
        <EmptyState icon="🎨" title="No photos found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <GalleryPhotoCard
              key={photo.photo_id}
              photo={photo}
              onUpdate={handleUpdate}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Step 1 — season/year prompt before opening the shared upload modal. */}
      <Modal isOpen={uploadPromptOpen} onClose={() => setUploadPromptOpen(false)}>
        <ModalContent>
          <ModalHeader>Upload Photo</ModalHeader>
          <ModalBody className="gap-4">
            <Select
              label="Season"
              isRequired
              selectedKeys={promptSeason ? [promptSeason] : []}
              onChange={(e) => setPromptSeason(e.target.value)}
            >
              {IMAGES_CONFIG.SEASONS.map((s) => (
                <SelectItem key={s.value}>{s.label}</SelectItem>
              ))}
            </Select>
            <Select
              label="Year"
              selectedKeys={[promptYear]}
              onChange={(e) => setPromptYear(e.target.value)}
            >
              {yearOptions().map((y) => (
                <SelectItem key={y}>{y}</SelectItem>
              ))}
            </Select>
            <div className="flex flex-col gap-1">
              <Switch isSelected={promptPublic} onValueChange={setPromptPublic}>
                Public
              </Switch>
              {promptPublic ? (
                <p className="text-tiny text-warning">
                  This photo will be published to the public gallery at gallery.spookydecs.com.
                </p>
              ) : (
                <p className="text-tiny text-default-500">
                  Private — visible only in the admin gallery.
                </p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setUploadPromptOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" isDisabled={!promptSeason} onPress={startUpload}>
              Continue to Upload
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Step 3 — optional per-photo display name + location. */}
      <Modal isOpen={!!postUpload} onClose={() => setPostUpload(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Set Photo Details</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500">
              Optionally set a display name and location for each uploaded photo.
            </p>
            {(postUpload ?? []).map((p) => (
              <div key={p.photo_id} className="flex items-center gap-3 border-b border-default-200 pb-3">
                <img
                  src={p.thumb_cloudfront_url || p.cloudfront_url}
                  alt=""
                  className="h-16 w-16 flex-shrink-0 rounded-medium object-cover"
                />
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    size="sm"
                    placeholder="Display name (e.g. Front Yard 2025)"
                    onValueChange={(v) => {
                      const cur = postMetaRef.current[p.photo_id] || { display_name: '', location: '' };
                      postMetaRef.current[p.photo_id] = { ...cur, display_name: v };
                    }}
                  />
                  <Select
                    size="sm"
                    label="Location"
                    onChange={(e) => {
                      const cur = postMetaRef.current[p.photo_id] || { display_name: '', location: '' };
                      postMetaRef.current[p.photo_id] = { ...cur, location: e.target.value };
                    }}
                  >
                    {LOCATION_OPTIONS.map((loc) => (
                      <SelectItem key={loc}>{loc}</SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPostUpload(null)}>
              Skip
            </Button>
            <Button color="primary" onPress={savePostUpload}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete photo?"
        body={`Delete "${deleteTarget?.gallery_data?.display_name || deleteTarget?.photo_id}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Step 2 — shared pre-upload editor (crop/rotate/brightness), one modal per file. */}
      {editor}
    </div>
  );
}
