import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, AutocompleteItem } from '@heroui/react';
import { useConfig, useAuth } from '@spookydecs/ui';
import { getRelatedIdConfig, isRelatedIdRequired, type RelatedIdConfig } from '../config/financeConfig';

interface RelatedOption {
  id: string;
  primary: string;
  secondary: string;
  itemId?: string;
}

function displayFields(item: any, config: RelatedIdConfig): RelatedOption {
  if (config.endpoint.includes('/items')) {
    return { id: item.id, primary: item.short_name, secondary: item.id, itemId: item.item_id };
  }
  if (config.endpoint.includes('/maintenance-records')) {
    return {
      id: item.record_id,
      primary: item.record_id,
      secondary: item.short_description || item.item_id,
      itemId: item.item_id,
    };
  }
  // ideas — ideas store their display name in `title` (idea_name/name are legacy/absent)
  return { id: item.id, primary: item.title || item.idea_name || item.name, secondary: item.id, itemId: item.item_id };
}

async function loadRelatedData(
  config: RelatedIdConfig,
  apiEndpoint: string,
  headers: Record<string, string>,
): Promise<any[]> {
  try {
    const response = await fetch(`${apiEndpoint}${config.endpoint}`, { headers });
    if (!response.ok) throw new Error(`Failed to fetch from ${config.endpoint}`);
    const json = await response.json();
    const data = json && typeof json === 'object' && 'data' in json ? json.data : json;

    if (config.endpoint.includes('/items')) {
      let items = data.items || data || [];
      if (!Array.isArray(items)) return [];
      if (config.classFilter?.length) items = items.filter((it: any) => config.classFilter!.includes(it.class));
      return items;
    }
    if (config.endpoint.includes('/maintenance-records')) {
      const records = data.records || data || [];
      return Array.isArray(records) ? records : [];
    }
    if (config.endpoint.includes('/ideas')) {
      const ideas = data.ideas || data || [];
      return Array.isArray(ideas) ? ideas : [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`Failed to load related data from ${config.endpoint}:`, err);
    return [];
  }
}

export function RelatedEntitySearch({
  costType,
  category,
  selectedId,
  error,
  onSelect,
}: {
  costType: string;
  category: string;
  selectedId?: string;
  error?: string;
  onSelect: (selection: { id: string; name: string; itemId?: string } | null) => void;
}) {
  const config = getRelatedIdConfig(costType);
  const { API_ENDPOINT } = useConfig();
  const { buildHeaders } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!config) {
      setData([]);
      return;
    }
    let active = true;
    loadRelatedData(config, API_ENDPOINT, buildHeaders()).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costType]);

  const options = useMemo<RelatedOption[]>(() => {
    if (!config) return [];
    return data.map((item) => displayFields(item, config));
  }, [data, config]);

  if (!config) return null;

  const required = isRelatedIdRequired(costType, category);

  return (
    <Autocomplete
      label={`${config.label}${required ? '' : ' (Optional)'}`}
      labelPlacement="outside"
      placeholder="Search…"
      isRequired={required}
      isInvalid={!!error}
      errorMessage={error}
      defaultItems={options}
      selectedKey={selectedId ?? null}
      onSelectionChange={(key) => {
        if (key == null) {
          onSelect(null);
          return;
        }
        const opt = options.find((o) => o.id === String(key));
        if (opt) onSelect({ id: opt.id, name: opt.primary, itemId: opt.itemId });
      }}
    >
      {(opt) => (
        <AutocompleteItem key={opt.id} textValue={opt.primary}>
          <div className="flex flex-col">
            <span>{opt.primary}</span>
            <span className="text-tiny text-default-400">{opt.secondary}</span>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}
