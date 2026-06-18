import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { formatCurrency, formatDate, type CostRecord } from '../config/financeConfig';

// Review-before-submit modal for the single-item cost form (replaces the vanilla
// CostReviewModal). Shown after validation passes; confirms the create.
function Field({ label, value, full = false, amount = false }: { label: string; value: React.ReactNode; full?: boolean; amount?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-tiny uppercase tracking-wide text-default-500">{label}</div>
      <div className={`text-foreground ${amount ? 'text-lg font-semibold' : ''}`}>{value}</div>
    </div>
  );
}

export function CostReviewModal({
  cost,
  isOpen,
  isSaving,
  onConfirm,
  onClose,
}: {
  cost: Partial<CostRecord> | null;
  isOpen: boolean;
  isSaving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Review Cost Record</ModalHeader>
        <ModalBody className="gap-5">
          {cost && (
            <>
              <section>
                <h3 className="mb-2 text-small font-semibold text-default-600">Basic Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Item Name" value={cost.item_name || 'N/A'} />
                  <Field label="Cost Date" value={cost.cost_date ? formatDate(cost.cost_date) : 'N/A'} />
                  {cost.description && <Field label="Description" value={cost.description} full />}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-small font-semibold text-default-600">Cost Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" value={(cost.cost_type as string)?.replace('_', ' ') || 'N/A'} />
                  <Field label="Category" value={cost.category || 'N/A'} />
                  {cost.subcategory && <Field label="Subcategory" value={cost.subcategory} />}
                  <Field label="Quantity" value={cost.quantity || 1} />
                  <Field label="Unit Cost" value={formatCurrency((cost.unit_cost ?? cost.total_cost) as number, cost.currency)} />
                  <Field label="Total Amount" value={formatCurrency(cost.total_cost as number, cost.currency || 'USD')} amount />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-small font-semibold text-default-600">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vendor" value={cost.vendor || 'N/A'} />
                  {cost.purchase_date && <Field label="Purchase Date" value={formatDate(cost.purchase_date)} />}
                </div>
              </section>

              {(cost.related_item_id || (cost as any).notes) && (
                <section>
                  <h3 className="mb-2 text-small font-semibold text-default-600">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {cost.related_item_id && <Field label="Related Item" value={cost.related_item_id} />}
                    {(cost as any).notes && <Field label="Notes" value={(cost as any).notes} full />}
                  </div>
                </section>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Go Back
          </Button>
          <Button color="primary" onPress={onConfirm} isLoading={isSaving}>
            Confirm &amp; Submit
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
