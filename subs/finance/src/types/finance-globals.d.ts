/**
 * Finance-specific ambient globals.
 *
 * The shared `window.SpookyConfig` / `window.SpookyAuth` typings come from
 * @spookydecs/ui. Finance additionally consumes the CDN `receipt-extractor-widget.js`
 * (`window.ReceiptExtractorWidget`) and the legacy `window.toast` the widget calls
 * internally. The widget stays CDN-only for #333; #382 replaces it with a
 * @spookydecs/ui `useReceiptExtractor` primitive, at which point this can drop the
 * ReceiptExtractorWidget declaration.
 */

export interface ReceiptExtractorConfirmedItem {
  item_name?: string;
  description?: string;
  cost_type?: string;
  category?: string;
  subcategory?: string;
  quantity?: number;
  unit_cost?: number;
  total_cost?: number;
  manufacturer?: string;
  vendor?: string;
  purchase_date?: string;
  related_item_id?: string;
  related_record_id?: string;
  related_idea_id?: string;
  extraction_id?: string;
  image_id?: string;
  [key: string]: unknown;
}

export interface ReceiptExtractorOpenConfig {
  apiEndpoint: string;
  extractEndpoint: string;
  sessionEndpoint?: string;
  sourceSub?: string;
  contextData?: {
    item_id?: string;
    record_id?: string;
    cost_type?: string;
    category?: string;
  };
  costConfig?: {
    costTypes?: unknown[];
    categoriesByCostType?: Record<string, unknown>;
    subcategories?: Record<string, unknown>;
    relatedIdConfig?: Record<string, unknown>;
  };
  caches?: {
    items?: unknown[];
    records?: unknown[];
    ideas?: unknown[];
  };
  onComplete?: (confirmedItems: ReceiptExtractorConfirmedItem[]) => void;
  onCancel?: () => void;
}

export interface ReceiptExtractorWidgetGlobal {
  open(config: ReceiptExtractorOpenConfig): void;
}

export interface LegacyToastGlobal {
  success?(message: string): void;
  error?(message: string): void;
  info?(message: string): void;
  warning?(message: string): void;
}

declare global {
  interface Window {
    ReceiptExtractorWidget: ReceiptExtractorWidgetGlobal;
    toast?: LegacyToastGlobal;
    /** pdf.js — loaded on demand by the receipt-extractor CDN widget; used by the
     *  pack form to rasterize a PDF receipt to an image before upload. */
    pdfjsLib?: any;
  }
}

export {};
