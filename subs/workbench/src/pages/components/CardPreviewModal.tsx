/**
 * Card preview modal — HeroUI Modal replacing the vanilla modal.js singleton.
 * Shows the selected card's fields and a "View Record ↗" deep link that opens
 * the source sub (ideas admin / maintenance) in a new tab.
 */
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Link,
} from '@heroui/react';
import { Typography } from '@spookydecs/ui';
import { ExternalLink } from 'lucide-react';
import { formatStatus, criticalityChipColor } from '../../lib/format';
import type { CardPreview } from './cards';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Typography type="body-xs" className="font-semibold uppercase tracking-wide text-default-400">
        {label}
      </Typography>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function CardPreviewModal({
  preview,
  onClose,
}: {
  preview: CardPreview | null;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={preview !== null} onClose={onClose} placement="center" scrollBehavior="inside">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="pr-10">{preview?.title}</ModalHeader>
            <ModalBody className="gap-4 pb-2">
              {preview && (
                <Chip size="sm" variant="flat" color={preview.statusColor} className="w-fit capitalize">
                  {formatStatus(preview.status)}
                </Chip>
              )}

              {preview?.type === 'idea' && (
                <>
                  {preview.description && <Field label="Description">{preview.description}</Field>}
                  {preview.link && (
                    <Field label="Link">
                      <Link href={preview.link} isExternal showAnchorIcon size="sm" className="break-all">
                        {preview.link}
                      </Link>
                    </Field>
                  )}
                  {preview.notes && (
                    <Field label="Notes">
                      <span className="whitespace-pre-wrap">{preview.notes}</span>
                    </Field>
                  )}
                </>
              )}

              {preview?.type === 'maintenance' && (
                <>
                  {preview.object && <Field label="Item">{preview.object}</Field>}
                  {preview.scheduled && <Field label="Scheduled">{preview.scheduled}</Field>}
                  {preview.criticality && (
                    <Field label="Criticality">
                      <Chip size="sm" variant="flat" color={criticalityChipColor(preview.criticality)} className="capitalize">
                        {formatStatus(preview.criticality)}
                      </Chip>
                    </Field>
                  )}
                  {preview.description && (
                    <Field label="Notes">
                      <span className="whitespace-pre-wrap">{preview.description}</span>
                    </Field>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={close}>
                Close
              </Button>
              {preview?.href && (
                <Button
                  as="a"
                  href={preview.href}
                  target="_blank"
                  rel="noopener"
                  color="primary"
                  endContent={<ExternalLink size={16} />}
                >
                  View Record
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
