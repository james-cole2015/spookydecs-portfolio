export type { SpookyConfigValues, SpookyConfigGlobal, SpookyTokenClaims, SpookyRole, SpookyAuthGlobal } from './types/spooky-globals';
export { ConfigProvider, useConfig } from './providers/ConfigProvider';
export { useAuth } from './hooks/useAuth';
export type { UseAuth } from './hooks/useAuth';
export { useToast } from './hooks/useToast';
export type { ToastApi } from './hooks/useToast';
export { usePhotoUpload } from './hooks/usePhotoUpload';
export type { UsePhotoUpload, PhotoUploadOptions, OpenPhotoUploadOptions, UploadedPhoto } from './hooks/usePhotoUpload';
export { useImageEditor } from './hooks/useImageEditor';
export type { UseImageEditor } from './hooks/useImageEditor';
export { useFilePicker } from './hooks/useFilePicker';
export type { UseFilePicker } from './hooks/useFilePicker';
export { ImageEditorModal } from './components/ImageEditorModal';
export type { ImageEditorModalProps } from './components/ImageEditorModal';
export { FileDropModal } from './components/FileDropModal';
export type { FileDropModalProps } from './components/FileDropModal';
export { getEditedImage, createImage } from './lib/imageCanvas';
export type { ImageSource, ImageTransforms, CropPixels } from './lib/imageCanvas';
export { useReceiptExtractor } from './hooks/useReceiptExtractor';
export type {
  UseReceiptExtractor,
  ReceiptExtractorConfig,
  ReceiptExtractorCostConfig,
  ReceiptExtractorCaches,
  ReceiptExtractorContextData,
  ReceiptExtractorRelatedConfig,
  ReceiptExtractorConfirmedItem,
  ReceiptExtractorOption,
  ReceiptExtractorPhase,
  ReceiptReviewItem,
} from './hooks/useReceiptExtractor';
export { ReceiptExtractorModal } from './components/ReceiptExtractorModal';
export type { ReceiptExtractorModalProps } from './components/ReceiptExtractorModal';
export { rasterizePdfToImage } from './lib/rasterizePdf';
export type { RasterizePdfOptions } from './lib/rasterizePdf';
export { ThemeProvider, useTheme } from './providers/ThemeProvider';
export type { Theme } from './providers/ThemeProvider';
export { ThemeSwitch } from './components/ThemeSwitch';
export { Typography } from './components/Typography';
export type { TypographyType } from './components/Typography';
export { Breadcrumbs, PageContainer, PageHeader, LoadingState, ErrorState, EmptyState } from './components/Layout';
export type { Crumb } from './components/Layout';
export { AppHeader } from './components/AppHeader';
export type { AppHeaderProps } from './components/AppHeader';
export { AuthGate } from './components/AuthGate';
export {
  StatusChip,
  SeasonChip,
  seasonChipColor,
  stateChipColor,
  priorityChipColor,
  effortChipColor,
  roleChipColor,
} from './components/chips';
export type { ChipColor } from './components/chips';
export { ConfirmDialog } from './components/ConfirmDialog';
export type { ConfirmDialogProps, ConfirmColor } from './components/ConfirmDialog';
export { useConfirm } from './hooks/useConfirm';
export type { UseConfirm, ConfirmOptions } from './hooks/useConfirm';
export { FilterBar } from './components/FilterBar';
export type { FilterBarProps, Filters, FilterOption } from './components/FilterBar';
export { PhotoGallery } from './components/PhotoGallery';
export type { PhotoGalleryProps, PhotoGalleryContext } from './components/PhotoGallery';
export { PhotoLightbox } from './components/PhotoLightbox';
export type { PhotoLightboxProps, LightboxPhoto, LightboxThumbnailProps } from './components/PhotoLightbox';
export { DemoResetBanner, isDemoEnv } from './components/DemoResetBanner';
export { spookyHeroUI } from './theme';
