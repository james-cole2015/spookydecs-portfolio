import { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Chip,
  Spinner,
} from '@heroui/react';
import { Camera, AlertTriangle } from 'lucide-react';
import { useToast, usePhotoUpload } from '@spookydecs/ui';
import { getItem, getRemovedConnections } from '../api/deploymentsApi';
import type { Deployment, Zone, Session, Connection } from '../config/deploymentsConfig';

interface ReviewData {
  items: Record<string, any>; // item_id -> item
  removedConnections: any[];
}

export function EndSessionReview({
  isOpen,
  onClose,
  deployment,
  zone: _zone,
  session,
  connections,
  pendingPhotoIds,
  onPhotosUpdated,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  deployment: Deployment;
  zone: Zone;
  session: Session;
  connections: Connection[];
  pendingPhotoIds: Record<string, string[]>;
  onPhotosUpdated: (connectionId: string, photoIds: string[]) => void;
  onConfirm: (notes: string, skipPhotos: boolean) => Promise<void>;
}) {
  const toast = useToast();
  const photoUpload = usePhotoUpload();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReviewData>({ items: {}, removedConnections: [] });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const sessionConnections = connections.filter(
    (conn: any) => conn.session_id === session.session_id,
  );

  async function loadSessionData() {
    setLoading(true);
    try {
      const removedResponse = await getRemovedConnections(
        deployment.deployment_id,
        session.session_id,
      ).catch(() => ({ success: false, data: [] }));
      const removedConnections = removedResponse.success ? removedResponse.data || [] : [];

      const deployedItemIds = [...new Set(sessionConnections.map((c: any) => c.to_item_id))];
      const itemResponses = await Promise.all(deployedItemIds.map((id) => getItem(id as string)));
      const items: Record<string, any> = {};
      itemResponses
        .filter((r) => r.success && r.data)
        .forEach((r) => {
          items[r.data.id] = r.data;
        });
      setData({ items, removedConnections });
    } catch (error) {
      console.error('[EndSessionReview] Error loading session data:', error);
      toast.showError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      loadSessionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleAddPhoto(connectionId: string, itemId: string) {
    const photos = await photoUpload.open({
      context: 'deployment',
      photo_type: 'deployment',
      season: deployment.season as string,
      year: Number(deployment.year),
      entityId: itemId,
      maxPhotos: 5,
      metadata: { 'deployment-id': deployment.deployment_id },
    });
    if (photos.length > 0) {
      onPhotosUpdated(
        connectionId,
        photos.map((p) => p.photo_id),
      );
      loadSessionData();
    }
  }

  async function confirmEndSession(skipPhotos: boolean) {
    setBusy(true);
    try {
      await onConfirm(notes.trim(), skipPhotos);
    } catch (error: any) {
      console.error('[EndSessionReview] End session failed:', error);
      toast.showError(error?.message || 'Failed to end session. Please try again.');
      setBusy(false);
    }
  }

  const totalConnections = sessionConnections.length;
  const connectionsWithPhotos = sessionConnections.filter(
    (conn) => (pendingPhotoIds[conn.connection_id] || []).length > 0,
  ).length;
  const missingPhotos = totalConnections - connectionsWithPhotos;

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>End Session — Review &amp; Add Photos</ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner color="secondary" />
            </div>
          ) : (
            <>
              <div className="rounded-medium bg-default-100 p-3 text-sm">
                <p>
                  You created <strong>{totalConnections}</strong> connection
                  {totalConnections !== 1 ? 's' : ''} in this session
                </p>
                {missingPhotos > 0 && (
                  <p className="mt-1 text-warning">
                    {missingPhotos} connection{missingPhotos !== 1 ? 's' : ''} missing photos
                  </p>
                )}
              </div>

              {sessionConnections.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-foreground">Connections</h4>
                  {sessionConnections.map((conn: any) => {
                    const item = data.items[conn.to_item_id];
                    const photoCount = pendingPhotoIds[conn.connection_id]?.length || 0;
                    const isDecoration = item && item.class === 'Decoration';
                    return (
                      <div
                        key={conn.connection_id}
                        className="flex items-center justify-between rounded-medium border border-default-200 p-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <span>{conn.from_item_id}</span>
                            <span className="text-default-400">→</span>
                            <span>{conn.to_item_id}</span>
                          </div>
                          {item && (
                            <div className="text-xs text-default-500">
                              {item.short_name || item.id}
                            </div>
                          )}
                        </div>
                        {isDecoration ? (
                          <div className="flex items-center gap-2">
                            {photoCount > 0 ? (
                              <Chip size="sm" variant="flat" startContent={<Camera size={14} />}>
                                {photoCount}
                              </Chip>
                            ) : (
                              <AlertTriangle size={16} className="text-warning" />
                            )}
                            <Button
                              size="sm"
                              variant="flat"
                              startContent={<Camera size={14} />}
                              onPress={() => handleAddPhoto(conn.connection_id, conn.to_item_id)}
                            >
                              {photoCount > 0 ? 'More' : 'Photo'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-default-400">
                            {item ? item.class : 'Item'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-default-500">No connections made in this session</p>
              )}

              {data.removedConnections.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Removed Items ({data.removedConnections.length})
                  </h4>
                  {data.removedConnections.map((conn: any) => (
                    <div
                      key={conn.connection_id}
                      className="flex items-center justify-between rounded-medium border border-default-200 bg-default-50 p-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <span>{conn.from_item_id}</span>
                          <span className="text-default-400">→</span>
                          <span>{conn.to_item_id}</span>
                        </div>
                        <div className="text-xs text-default-500">
                          {conn.connection_id}
                          {conn.removal_reason ? ` · ${conn.removal_reason}` : ''}
                        </div>
                      </div>
                      <Chip size="sm" color="danger" variant="flat">
                        Removed
                      </Chip>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="mb-1 text-sm font-semibold text-foreground">
                  Session Notes (Optional)
                </h4>
                <Textarea
                  placeholder="Add notes about this session..."
                  value={notes}
                  onValueChange={setNotes}
                  minRows={3}
                />
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={busy}>
            Cancel
          </Button>
          <Button variant="flat" onPress={() => confirmEndSession(true)} isDisabled={busy}>
            Skip Photos &amp; End
          </Button>
          <Button color="primary" onPress={() => confirmEndSession(false)} isLoading={busy}>
            End Session
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
