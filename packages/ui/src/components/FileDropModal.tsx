/**
 * FileDropModal — the shared "choose photos" entry step for the pre-upload editor
 * (#482). A HeroUI modal with a drag-and-drop zone *and* click-to-browse, multi-file,
 * images-only. Resolves the chosen `File[]` on Continue (or `[]` on cancel); the
 * caller (`useFilePicker` → `openWithEditor`) then runs each file through the editor.
 *
 * Replaces the bare `<input type=file>` the first cut used, restoring the drag-and-drop
 * affordance the CDN upload modal offered. Hand-rolled (no react-dropzone dependency).
 */
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { UploadCloud, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

export interface FileDropModalProps {
  isOpen: boolean;
  /** Max files accepted (excess is trimmed with the earliest kept). Default unlimited. */
  maxFiles?: number;
  /** Called with the chosen files when the user continues. */
  onConfirm: (files: File[]) => void;
  /** Called on cancel/dismiss. */
  onCancel: () => void;
}

const isImage = (f: File) => f.type.startsWith('image/');

export function FileDropModal({ isOpen, maxFiles, onConfirm, onCancel }: FileDropModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const images = incoming.filter(isImage);
      setFiles((prev) => {
        const next = [...prev, ...images];
        return maxFiles != null ? next.slice(0, maxFiles) : next;
      });
    },
    [maxFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files ?? []));
    },
    [addFiles],
  );

  const reset = useCallback(() => {
    setFiles([]);
    setDragging(false);
  }, []);

  const confirm = () => {
    onConfirm(files);
    reset();
  };
  const cancel = () => {
    onCancel();
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={cancel} size="lg" backdrop="blur">
      <ModalContent>
        <ModalHeader>Add Photos</ModalHeader>
        <ModalBody className="gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-medium border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? 'border-primary bg-primary-50 text-primary'
                : 'border-default-300 bg-default-50 text-default-500 hover:border-default-400'
            }`}
          >
            <UploadCloud size={32} />
            <span className="text-small font-medium">Drag &amp; drop images here</span>
            <span className="text-tiny text-default-400">or click to browse</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={maxFiles !== 1}
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />

          {files.length > 0 && (
            <ul className="flex flex-col gap-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-small bg-default-100 px-3 py-1.5 text-small"
                >
                  <span className="truncate">{f.name}</span>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    aria-label={`Remove ${f.name}`}
                    onPress={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={cancel}>
            Cancel
          </Button>
          <Button color="primary" onPress={confirm} isDisabled={files.length === 0}>
            Continue{files.length > 0 ? ` (${files.length})` : ''}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
