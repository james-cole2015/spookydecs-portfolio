/**
 * ImageEditorModal — the shared pre-upload photo editor (crop / zoom / rotate /
 * straighten / flip / brightness), built on react-easy-crop and the HeroUI
 * `Modal`→`ModalContent`→Header/Body/Footer pattern used by `ConfirmDialog`
 * and `ReceiptExtractorModal`.
 *
 * Self-contained: it owns the transform state, runs `getEditedImage` on Apply, and
 * hands the caller a finished `Blob` (`onApply`). "Use original" (`onSkip`) passes the
 * source through untouched. Driven one file at a time by `useImageEditor`.
 *
 * `source` is intentionally `File | string` (a fresh upload File, or a CDN image URL)
 * so #483's post-upload re-edit can reuse this modal on a library photo unchanged.
 */
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Slider,
} from '@heroui/react';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { getEditedImage, type ImageSource } from '../lib/imageCanvas';

export interface ImageEditorModalProps {
  isOpen: boolean;
  /** The image to edit — a `File` (pre-upload) or an image URL (post-upload re-edit). */
  source: ImageSource | null;
  /** Aspect ratio for the crop box. Omit/undefined = free crop. */
  aspect?: number;
  /** Called with the edited image once the user applies their changes. */
  onApply: (blob: Blob) => void;
  /** Called when the user keeps the original unedited. */
  onSkip: () => void;
  /** Called on dismiss/cancel (treated as skip by the hook). */
  onClose: () => void;
}

const INITIAL_CROP: Point = { x: 0, y: 0 };

export function ImageEditorModal({
  isOpen,
  source,
  aspect,
  onApply,
  onSkip,
  onClose,
}: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Point>(INITIAL_CROP);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  // Reset all transforms whenever a new source is loaded (batch: next file).
  useEffect(() => {
    setCrop(INITIAL_CROP);
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(1);
    setCroppedAreaPixels(null);
  }, [source]);

  // react-easy-crop wants a plain File/URL/HTMLImageElement src; give it an object URL for Files.
  const cropperSrc = useMemo(() => {
    if (!source) return '';
    return source instanceof File ? URL.createObjectURL(source) : (source as string);
  }, [source]);
  useEffect(() => {
    return () => {
      if (source instanceof File && cropperSrc) URL.revokeObjectURL(cropperSrc);
    };
  }, [source, cropperSrc]);

  async function handleApply() {
    if (!source || !croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getEditedImage(source, {
        crop: croppedAreaPixels,
        rotation,
        flipHorizontal: flipH,
        flipVertical: flipV,
        brightness,
      });
      onApply(blob);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" backdrop="blur">
      <ModalContent>
        <ModalHeader>Edit Photo</ModalHeader>
        <ModalBody className="gap-4">
          <div className="relative h-[360px] w-full overflow-hidden rounded-medium bg-default-200">
            {cropperSrc && (
              <Cropper
                image={cropperSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                transform={[
                  `translate(${crop.x}px, ${crop.y}px)`,
                  `rotateZ(${rotation}deg)`,
                  `scaleX(${flipH ? -1 : 1})`,
                  `scaleY(${flipV ? -1 : 1})`,
                  `scale(${zoom})`,
                ].join(' ')}
                style={{ mediaStyle: { filter: `brightness(${brightness})` } }}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<RotateCcw size={16} />}
              onPress={() => setRotation((r) => r - 90)}
            >
              Rotate left
            </Button>
            <Button
              size="sm"
              variant="flat"
              startContent={<RotateCw size={16} />}
              onPress={() => setRotation((r) => r + 90)}
            >
              Rotate right
            </Button>
            <Button
              size="sm"
              variant={flipH ? 'solid' : 'flat'}
              color={flipH ? 'primary' : 'default'}
              startContent={<FlipHorizontal size={16} />}
              onPress={() => setFlipH((v) => !v)}
            >
              Flip H
            </Button>
            <Button
              size="sm"
              variant={flipV ? 'solid' : 'flat'}
              color={flipV ? 'primary' : 'default'}
              startContent={<FlipVertical size={16} />}
              onPress={() => setFlipV((v) => !v)}
            >
              Flip V
            </Button>
          </div>

          <Slider
            label="Zoom"
            size="sm"
            minValue={1}
            maxValue={3}
            step={0.01}
            value={zoom}
            onChange={(v) => setZoom(Array.isArray(v) ? v[0] : v)}
          />
          <Slider
            label="Straighten"
            size="sm"
            minValue={-45}
            maxValue={45}
            step={1}
            value={rotation % 360}
            getValue={(v) => `${v}°`}
            onChange={(v) => setRotation(Array.isArray(v) ? v[0] : v)}
          />
          <Slider
            label="Brightness"
            size="sm"
            startContent={<Sun size={16} />}
            minValue={0.2}
            maxValue={2}
            step={0.01}
            value={brightness}
            onChange={(v) => setBrightness(Array.isArray(v) ? v[0] : v)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onSkip} isDisabled={applying}>
            Use original
          </Button>
          <Button color="primary" onPress={handleApply} isLoading={applying}>
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
