/**
 * EntityPicker — a typed, search-as-you-type picker for a single record.
 *
 * Controlled: the caller owns the option list and the query (so it can run a
 * server search for items, or filter a cached list for ideas/records). The
 * picker only renders the HeroUI Autocomplete and reports the selected key.
 */
import { Autocomplete, AutocompleteItem } from '@heroui/react';

export interface PickerOption {
  /** Record id; returned via onSelect. */
  id: string;
  /** Primary label shown in the list. */
  label: string;
  /** Optional secondary line (e.g. status, deployment year). */
  description?: string;
}

export interface EntityPickerProps {
  label: string;
  options: PickerOption[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
  /** Hint shown under the field (e.g. "Type at least 2 characters"). */
  hint?: string;
  isDisabled?: boolean;
}

export function EntityPicker({
  label,
  options,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  loading = false,
  hint,
  isDisabled = false,
}: EntityPickerProps) {
  return (
    <Autocomplete
      label={label}
      variant="bordered"
      inputValue={query}
      onInputChange={onQueryChange}
      selectedKey={selectedId}
      onSelectionChange={(key) => onSelect(key === null ? null : String(key))}
      items={options}
      isLoading={loading}
      isDisabled={isDisabled}
      description={hint}
      allowsCustomValue={false}
    >
      {(option) => (
        <AutocompleteItem key={option.id} textValue={option.label}>
          <div className="flex flex-col">
            <span className="text-small text-foreground">{option.label}</span>
            {option.description && (
              <span className="text-tiny text-default-500">{option.description}</span>
            )}
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}
