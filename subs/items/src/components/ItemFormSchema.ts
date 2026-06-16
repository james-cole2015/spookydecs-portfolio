// react-hook-form schema for item create/edit (#332)
// All fields optional at schema level; required validation lives in the form.

export interface ItemFormValues {
  // step 1 + 2 (wizard) or locked (edit)
  class: string;
  class_type: string;
  // step 3 basic
  short_name: string;
  season: string;
  status: string;
  date_acquired: string;
  general_notes: string;
  // class-specific
  height_length: string;
  stakes: string;
  tethers: string;
  adapter: string;
  power_inlet: boolean;
  color: string;
  bulb_type: string;
  length: string;
  male_ends: string;
  female_ends: string;
  watts: string;
  amps: string;
  // vendor
  vendor_cost: string;
  vendor_value: string;
  vendor_manufacturer: string;
  vendor_store: string;
  // storage
  storage_tote_id: string;
  storage_location: string;
}

export const DEFAULT_VALUES: ItemFormValues = {
  class: '', class_type: '',
  short_name: '', season: '', status: 'Packed',
  date_acquired: '', general_notes: '',
  height_length: '', stakes: '', tethers: '', adapter: '', power_inlet: false,
  color: '', bulb_type: '', length: '', male_ends: '', female_ends: '', watts: '', amps: '',
  vendor_cost: '', vendor_value: '', vendor_manufacturer: '', vendor_store: '',
  storage_tote_id: '', storage_location: '',
};
