/**
 * InlineTagsEdit — add/remove chip editor for the idea's tags list, replacing
 * FormPage's comma-string Input. Adapted from DetailPage's own Materials
 * add/remove pattern (Chip + small add Input).
 */
import { useState } from 'react';
import { Chip, Input, Button } from '@heroui/react';
import { Plus } from 'lucide-react';

export function InlineTagsEdit({
  tags,
  onSave,
}: {
  tags: string[];
  onSave: (next: string[]) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function commit(next: string[]) {
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  function add() {
    const t = value.trim();
    if (!t || tags.includes(t)) {
      setValue('');
      return;
    }
    setValue('');
    void commit([...tags, t]);
  }

  return (
    <div className={`flex flex-col gap-2 ${saving ? 'opacity-50' : ''}`}>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Chip key={t} size="sm" variant="flat" onClose={() => void commit(tags.filter((x) => x !== t))}>
              {t}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          size="sm"
          placeholder="Add tag…"
          value={value}
          onValueChange={setValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button isIconOnly size="sm" variant="flat" aria-label="Add tag" onPress={add}>
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}
