/**
 * DismissModal — HeroUI port of the vanilla DismissViolationModal. Enforces the
 * 50–300 character dismissal-reason policy (submit disabled until in range).
 */
import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
} from '@heroui/react';
import { useToast } from '@spookydecs/ui';
import { InspectorAPI } from '../api/inspectorApi';
import type { Violation } from '../config/inspectorConfig';

const MIN_CHARS = 50;
const MAX_CHARS = 300;

export function DismissModal({
  isOpen,
  violation,
  onClose,
  onDismissed,
}: {
  isOpen: boolean;
  violation: Violation;
  onClose: () => void;
  onDismissed: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const length = reason.length;
  const tooShort = length < MIN_CHARS;
  const remaining = MIN_CHARS - length;

  function handleClose() {
    if (submitting) return;
    setReason('');
    onClose();
  }

  async function handleDismiss() {
    const notes = reason.trim();
    if (notes.length < MIN_CHARS) {
      toast.showError(`Dismissal reason must be at least ${MIN_CHARS} characters`);
      return;
    }
    setSubmitting(true);
    try {
      await InspectorAPI.dismissViolation(violation.violation_id, notes);
      toast.showSuccess('Violation dismissed successfully');
      setReason('');
      onClose();
      onDismissed();
    } catch (error) {
      toast.showError(`Failed to dismiss violation: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} backdrop="blur" size="lg">
      <ModalContent>
        <ModalHeader>Dismiss Violation</ModalHeader>
        <ModalBody className="space-y-4">
          <div className="space-y-1 text-default-600">
            <p>
              Dismissing a violation marks it as reviewed and acceptable. Once dismissed, this
              violation will not be re-detected by future rule runs.
            </p>
            <p className="font-medium text-foreground">
              Please explain why this violation is being dismissed ({MIN_CHARS}–{MAX_CHARS}{' '}
              characters):
            </p>
          </div>

          <Textarea
            autoFocus
            minRows={5}
            maxLength={MAX_CHARS}
            value={reason}
            onValueChange={setReason}
            placeholder="Enter reason for dismissal..."
            description={
              tooShort
                ? `${remaining} more character${remaining === 1 ? '' : 's'} required`
                : '(meets requirements)'
            }
            color={tooShort ? 'warning' : 'success'}
          />
          <div className="text-right text-tiny text-default-500">
            {length} / {MAX_CHARS}
          </div>

          <div className="rounded-medium bg-content2 p-3 text-small text-default-600">
            <h4 className="mb-2 font-semibold text-foreground">Violation Details</h4>
            <p>
              <strong>Rule:</strong> {violation.rule_id}
            </p>
            <p>
              <strong>Item:</strong>{' '}
              {violation.violation_details?.item_short_name || violation.entity_id}
            </p>
            <p>
              <strong>Issue:</strong> {violation.violation_details?.message || 'N/A'}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose} isDisabled={submitting}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleDismiss} isDisabled={tooShort} isLoading={submitting}>
            Dismiss
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
