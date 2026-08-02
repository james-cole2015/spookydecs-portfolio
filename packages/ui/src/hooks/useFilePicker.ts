/**
 * useFilePicker — imperative, promise-based file selection via the shared
 * `FileDropModal` (drag-and-drop + browse), paired like `useConfirm`/`useImageEditor`.
 * Call `pickFiles()` and `await` the chosen `File[]`; mount `picker` once in the tree.
 *
 *   const { pickFiles, picker } = useFilePicker();
 *   const files = await pickFiles();   // drag-drop or browse, multi-file
 *   // …then render `{picker}` somewhere in the component.
 */
import { createElement, useCallback, useMemo, useRef, useState, type ReactElement } from 'react';
import { FileDropModal } from '../components/FileDropModal';

export interface UseFilePicker {
  /** Open the dropzone; resolve with the chosen files (or `[]` if cancelled). */
  pickFiles: (maxFiles?: number) => Promise<File[]>;
  /** The dropzone element to mount once in the component tree. */
  picker: ReactElement;
}

export function useFilePicker(): UseFilePicker {
  const [isOpen, setIsOpen] = useState(false);
  const [maxFiles, setMaxFiles] = useState<number | undefined>(undefined);
  const resolverRef = useRef<((files: File[]) => void) | null>(null);

  const settle = useCallback((files: File[]) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setIsOpen(false);
    resolve?.(files);
  }, []);

  const pickFiles = useCallback(
    (max?: number) =>
      new Promise<File[]>((resolve) => {
        resolverRef.current = resolve;
        setMaxFiles(max);
        setIsOpen(true);
      }),
    [],
  );

  const picker = useMemo(
    () =>
      createElement(FileDropModal, {
        isOpen,
        maxFiles,
        onConfirm: (files: File[]) => settle(files),
        onCancel: () => settle([]),
      }),
    [isOpen, maxFiles, settle],
  );

  return { pickFiles, picker };
}
