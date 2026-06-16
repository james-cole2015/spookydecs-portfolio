// Item domain types (#332)

export interface ItemImages {
  primary_photo_id?: string;
  secondary_photo_ids?: string[];
  cloudfront_url?: string;
  thumb_cloudfront_url?: string;
}

export interface StorageData {
  is_stored?: boolean;
  tote_id?: string;
  location?: string;
  packable?: boolean;
  single_packed?: boolean;
}

export interface VendorMetadata {
  cost?: string | number;
  value?: string | number;
  manufacturer?: string;
  vendor_store?: string;
}

export interface RepairData {
  needs_repair?: boolean;
  operational_blocker_record_id?: string;
}

export interface InspectionData {
  applied_templates?: string[];
  next_inspection_date?: string;
  last_synced_at?: string;
}

export interface RecurringMaintenanceData {
  applied_templates?: string[];
  next_maintenance_date?: string;
  last_synced_at?: string;
}

export interface GenerationHistoryEntry {
  template_id: string;
  record_id: string;
  due_date: string;
}

export interface MaintenanceData {
  repair_data?: RepairData;
  inspection_data?: InspectionData;
  maintenance_data?: RecurringMaintenanceData;
  generation_history?: GenerationHistoryEntry[];
}

export interface DeploymentData {
  deployed?: boolean;
  last_deployment_id?: string;
  last_deployed_at?: string;
  previous_deployments?: string[];
}

export interface Item {
  id: string;
  // API returns snake_case; camelCase fields come from the create/update mapping
  class: string;
  class_type: string;
  short_name: string;
  season: string;
  status: string;
  date_acquired?: string;
  general_notes?: string;
  // class-specific
  height_length?: string;
  stakes?: string | number;
  tethers?: string | number;
  adapter?: string;
  power_inlet?: boolean;
  color?: string;
  bulb_type?: string;
  length?: string;
  male_ends?: string | number;
  female_ends?: string | number;
  watts?: string;
  amps?: string;
  // meta
  images?: ItemImages;
  storage_data?: StorageData;
  vendor_metadata?: VendorMetadata;
  maintenance?: MaintenanceData;
  operational_status?: boolean;
  search_text?: string;
  source_idea_id?: string;
  deployment_data?: DeploymentData;
}

export interface CascadePreview {
  maintenance_count?: number;
  cost_count?: number;
  photo_count?: number;
  [key: string]: unknown;
}

export interface Photo {
  photo_id: string;
  cloudfront_url?: string;
  thumb_cloudfront_url?: string;
  is_primary?: boolean;
  [key: string]: unknown;
}

export interface MaintenanceRecord {
  id: string;
  item_id?: string;
  record_type?: string;
  status?: string;
  title?: string;
  description?: string;
  date_performed?: string;
  date_scheduled?: string;
  created_at?: string;
  [key: string]: unknown;
}
