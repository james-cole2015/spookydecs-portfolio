/**
 * InlineEdit — click-to-edit field used in the build workspace (ported from
 * build-detail.js `_attachInlineEdits`). Click the value to reveal an input;
 * Enter (or blur) saves via onSave, Escape cancels. Supports text/textarea/url.
 */
import { useState } from 'react';
import { Input, Textarea, Link } from '@heroui/react';

export function InlineEdit({
  value,
  type = 'text',
  placeholder = 'Click to add…',
  onSave,
}: {
  value: string;
  type?: 'text' | 'textarea' | 'url';
  placeholder?: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next === (value || '').trim()) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const common = {
      autoFocus: true,
      value: draft,
      onValueChange: setDraft,
      onBlur: commit,
      size: 'sm' as const,
    };
    if (type === 'textarea') {
      return (
        <Textarea
          {...common}
          minRows={3}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(value);
              setEditing(false);
            }
          }}
        />
      );
    }
    return (
      <Input
        {...common}
        type={type === 'url' ? 'url' : 'text'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  const isEmpty = !value;
  return (
    <div
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setDraft(value);
          setEditing(true);
        }
      }}
      className={`cursor-text rounded-medium px-2 py-1 transition-colors hover:bg-default-100 ${
        saving ? 'opacity-50' : ''
      }`}
    >
      {isEmpty ? (
        <span className="text-small text-default-400">{placeholder}</span>
      ) : type === 'url' ? (
        <Link href={value} isExternal size="sm" className="break-all" onClick={(e) => e.stopPropagation()}>
          {value}
        </Link>
      ) : (
        <span className="whitespace-pre-wrap text-small text-foreground/80">{value}</span>
      )}
    </div>
  );
}
