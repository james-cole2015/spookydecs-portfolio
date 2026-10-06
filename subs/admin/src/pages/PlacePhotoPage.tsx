/**
 * Place Photo — attach a new photo to an existing record from one admin place (#621).
 *
 * The core case is out-of-band: the record was completed earlier, and the photo is
 * taken and uploaded later. Pick a target type, pick the record, upload. Uploads go
 * through the shared usePhotoUpload pipeline with the owning sub's context, so the
 * photo lands where that sub already expects it. Connection photos are linked to the
 * connection after upload.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Select, SelectItem, Tab, Tabs } from '@heroui/react';
import { ArrowLeft, Camera } from 'lucide-react';
import {
  EntityList,
  EntityPicker,
  LoadingState,
  ErrorState,
  PageHeader,
  usePhotoUpload,
  useToast,
  type EntityListOption,
  type PickerOption,
} from '@spookydecs/ui';
import { useNavigate } from 'react-router-dom';
import {
  attachPhotosToConnection,
  listConnectionOptions,
  listIdeaOptions,
  listMaintenanceOptions,
  searchItemOptions,
  type ConnectionOption,
  type MaintenanceOption,
  type PlaceTarget,
} from '../api/placePhoto';

/** Upload context per target. The connection target uploads under `deployment`. */
const TARGET_CONTEXT: Record<PlaceTarget, string> = {
  item: 'item',
  connection: 'deployment',
  idea: 'idea',
  maintenance: 'maintenance',
};

const TARGET_LABEL: Record<PlaceTarget, string> = {
  item: 'Item',
  connection: 'Connection',
  idea: 'Idea',
  maintenance: 'Maintenance / Inspection',
};

export default function PlacePhotoPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { openWithEditor, editor } = usePhotoUpload();

  const [target, setTarget] = useState<PlaceTarget>('item');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Label is kept at pick time: item search results can change while a record stays selected.
  const [selectedLabel, setSelectedLabel] = useState<{ label: string; description?: string } | null>(null);
  // The list is open until a record is picked; it collapses to a summary card after that.
  const [editing, setEditing] = useState(true);

  // Options for the current target. Item options come from a debounced server search;
  // the other targets load their full list once and filter it client-side.
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [connections, setConnections] = useState<ConnectionOption[] | null>(null);
  const [selectedConnectionKey, setSelectedConnectionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Reset selection when the target type changes.
  useEffect(() => {
    setQuery('');
    setSelectedId(null);
    setSelectedLabel(null);
    setSelectedConnectionKey(null);
    setEditing(true);
    setOptions([]);
  }, [target]);

  // Item search: debounced server search on every query change.
  useEffect(() => {
    if (target !== 'item') return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchItemOptions(query);
        if (!cancelled) setOptions(found);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Item search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [target, query]);

  // Idea / maintenance / connection lists: load once per target, filter client-side.
  useEffect(() => {
    if (target === 'item') return;
    let cancelled = false;
    setError(null);
    setLoading(true);

    const load = async () => {
      try {
        if (target === 'idea') {
          const all = await listIdeaOptions();
          if (!cancelled) setOptions(all);
        } else if (target === 'maintenance') {
          const all = await listMaintenanceOptions();
          if (!cancelled) setOptions(all);
        } else {
          const all = await listConnectionOptions();
          if (!cancelled) setConnections(all);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [target]);

  // Connection target: items that touch at least one connection, filtered by the query.
  const connectionItemOptions = useMemo<EntityListOption[]>(() => {
    if (!connections) return [];
    const byItem = new Map<string, number>();
    for (const c of connections) {
      for (const id of c.itemIds) byItem.set(id, (byItem.get(id) ?? 0) + 1);
    }
    return Array.from(byItem.entries()).map(([id, count]) => ({
      id,
      label: id,
      description: `${count} connection${count === 1 ? '' : 's'}`,
    }));
  }, [connections]);

  const connectionsForItem = useMemo(
    () => (connections ?? []).filter((c) => selectedId && c.itemIds.includes(selectedId)),
    [connections, selectedId],
  );

  // Lists show every candidate and filter in place; items use the server search.
  const listOptions = target === 'connection' ? connectionItemOptions : options;
  const selectedConnection = connectionsForItem.find(
    (c) => `${c.deploymentId}::${c.connectionId}` === selectedConnectionKey,
  );

  // The record that receives the upload. For connections it is the deployment and the
  // connection is linked after upload.
  const canUpload =
    target === 'connection' ? Boolean(selectedConnection) : Boolean(selectedId);

  // After a successful upload, clear the selection so the next record starts fresh.
  // Target type and the loaded lists stay as they are.
  const resetSelection = () => {
    setSelectedId(null);
    setSelectedLabel(null);
    setSelectedConnectionKey(null);
    setQuery('');
    setEditing(true);
  };

  const handlePick = (id: string) => {
    const source = target === 'connection' ? connectionItemOptions : options;
    const match = source.find((o) => o.id === id);
    setSelectedId(id);
    setSelectedLabel(match ? { label: match.label, description: match.description } : { label: id });
    setSelectedConnectionKey(null);
    setEditing(false);
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      if (target === 'connection' && selectedConnection) {
        const photos = await openWithEditor({
          context: TARGET_CONTEXT.connection,
          entityId: selectedConnection.deploymentId,
        });
        if (photos.length === 0) return;
        await attachPhotosToConnection(
          selectedConnection.deploymentId,
          selectedConnection.connectionId,
          photos.map((p) => p.photo_id),
        );
        toast.showSuccess(
          `${photos.length} photo${photos.length === 1 ? '' : 's'} linked to connection ${selectedConnection.connectionId}.`,
        );
        resetSelection();
        return;
      }

      if (selectedId) {
        // A maintenance photo also carries its item, so it is not orphaned in the images sub.
        const maintenanceItemId =
          target === 'maintenance'
            ? (options as MaintenanceOption[]).find((o) => o.id === selectedId)?.itemId
            : undefined;
        const photos = await openWithEditor({
          context: TARGET_CONTEXT[target],
          entityId: selectedId,
          ...(maintenanceItemId ? { metadata: { item_ids: [maintenanceItemId] } } : {}),
        });
        if (photos.length === 0) return;
        toast.showSuccess(
          `${photos.length} photo${photos.length === 1 ? '' : 's'} uploaded to ${TARGET_LABEL[target]} ${selectedId}.`,
        );
        resetSelection();
      }
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Place Photo"
        subtitle="Attach a photo to a record you already completed. Pick the record, then upload."
        actions={
          <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/')}>
            Back
          </Button>
        }
      />

      <Card shadow="md" className="bg-content1">
        <CardHeader className="flex-col items-stretch gap-3">
          <Tabs
            aria-label="Target type"
            selectedKey={target}
            onSelectionChange={(key) => setTarget(key as PlaceTarget)}
          >
            {(Object.keys(TARGET_LABEL) as PlaceTarget[]).map((t) => (
              <Tab key={t} title={TARGET_LABEL[t]} />
            ))}
          </Tabs>
        </CardHeader>

        <CardBody className="gap-5">
          {error && <ErrorState message={error} />}

          {editing || !selectedId ? (
            target === 'item' ? (
              <EntityPicker
                label="Search items"
                options={options}
                query={query}
                onQueryChange={setQuery}
                selectedId={selectedId}
                onSelect={(id) => {
                  if (id) handlePick(id);
                }}
                loading={loading}
                hint={query.trim().length < 2 ? 'Type at least 2 characters to search' : undefined}
              />
            ) : (
              <EntityList
                searchLabel={`Filter ${TARGET_LABEL[target].toLowerCase()}`}
                options={listOptions}
                selectedId={selectedId}
                onSelect={handlePick}
                loading={loading}
                emptyText={`No ${TARGET_LABEL[target].toLowerCase()} to show`}
              />
            )
          ) : (
            <Card className="bg-content2 shadow-none">
              <CardBody className="flex-row items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-tiny uppercase tracking-wide text-default-500">
                    {TARGET_LABEL[target]}
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {selectedLabel?.label ?? selectedId}
                  </span>
                  {selectedLabel?.description && (
                    <span className="truncate text-tiny text-default-500">{selectedLabel.description}</span>
                  )}
                </div>
                <Button
                  variant="flat"
                  size="sm"
                  onPress={() => {
                    setEditing(true);
                    setSelectedConnectionKey(null);
                  }}
                >
                  Change
                </Button>
              </CardBody>
            </Card>
          )}

          {target === 'connection' && selectedId && (
            <Select
              label="Connection"
              variant="bordered"
              selectedKeys={selectedConnectionKey ? [selectedConnectionKey] : []}
              onSelectionChange={(keys) => setSelectedConnectionKey(Array.from(keys)[0] as string)}
              isDisabled={connectionsForItem.length === 0}
            >
              {connectionsForItem.map((c) => (
                <SelectItem key={`${c.deploymentId}::${c.connectionId}`} textValue={c.description}>
                  {c.description}
                </SelectItem>
              ))}
            </Select>
          )}

          {target === 'connection' && loading && connections === null && <LoadingState />}

          <div className="flex justify-end">
            <Button
              color="primary"
              startContent={<Camera size={16} />}
              isDisabled={!canUpload}
              isLoading={uploading}
              onPress={handleUpload}
            >
              Choose photos to upload
            </Button>
          </div>
        </CardBody>
      </Card>

      {editor}
    </>
  );
}
