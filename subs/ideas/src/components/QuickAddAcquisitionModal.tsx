/**
 * QuickAddAcquisitionModal — the URL-only "quick add" entry point (#526).
 *
 * Collapses acquisition creation to a single product URL: it posts a create-stub
 * (PENDING_TITLE + STUB_SEASON placeholders — POST /acquisitions requires both),
 * fires Renfield (startEnrichment), and navigates to the new detail page where the
 * existing #499 enrich poll fills the record in and Renfield backfills the real
 * title + season. HeroUI-first plain form dialog (design.md §2), modeled on
 * CostLogModal. If enrich-start fails (e.g. demo quota) we still navigate — the user
 * lands on a valid editable draft and can "Ask Renfield" manually.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react';
import { useToast } from '@spookydecs/ui';
import { createAcquisition, startEnrichment } from '../api/acquisitionsApi';
import { PENDING_TITLE, STUB_SEASON } from '../config/acquisitionsConfig';

// Client-side URL guard (AC #4): a parseable absolute http(s) URL. The backend
// no-URL 400 guard on POST /{id}/enrich remains the backstop.
function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function QuickAddAcquisitionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = url.trim();
  // Only surface the invalid state once the user has typed something — an empty
  // field is "incomplete", not "invalid".
  const invalid = useMemo(() => trimmed.length > 0 && !isValidUrl(trimmed), [trimmed]);
  const canSubmit = trimmed.length > 0 && !invalid && !saving;

  function handleClose() {
    if (saving) return;
    setUrl('');
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      // 1. Create the stub with placeholders the worker overwrites on enrich.
      const created = await createAcquisition({
        title: PENDING_TITLE,
        season: STUB_SEASON,
        url: trimmed,
      });
      const id = created?.acquisition_id;
      if (!id) throw new Error('Create returned no acquisition id');

      // 2. Fire Renfield (202, stamps in_progress). A failure here (e.g. demo quota)
      //    must NOT strand the user — the record is a valid editable draft.
      try {
        await startEnrichment(id);
      } catch (err) {
        toast.showError('Renfield could not start: ' + (err as Error).message);
      }

      // 3. Land on the detail page; the #499 poll auto-resumes on an in_progress record.
      setUrl('');
      onClose();
      navigate(`/acquisitions/${id}`);
    } catch (err) {
      toast.showError('Failed to create acquisition: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Quick Add
          <span className="text-small font-normal text-default-500">
            Paste a product URL — Renfield names it, tags the season, and pre-fills the purchase.
          </span>
        </ModalHeader>
        <ModalBody className="gap-4">
          <Input
            isRequired
            autoFocus
            type="url"
            label="Product URL"
            placeholder="https://www.example.com/spooky-inflatable"
            value={url}
            onValueChange={setUrl}
            isInvalid={invalid}
            errorMessage={invalid ? 'Enter a valid http(s) product URL.' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) void handleSubmit();
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSubmit} isDisabled={!canSubmit} isLoading={saving}>
            Add &amp; Enrich
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
