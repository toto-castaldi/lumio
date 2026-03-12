import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Sanitize a tag value: lowercase, spaces to hyphens, strip non-alphanumeric/hyphen. */
function sanitizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function TagInput({ tags, onChange, placeholder = 'Add tag...', disabled = false }: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = sanitizeTag(raw);
    if (tag.length === 0) return;
    if (tags.includes(tag)) {
      setInput('');
      return;
    }
    onChange([...tags, tag]);
    setInput('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-md border border-lumio-border bg-lumio-bg px-2 py-1.5 focus-within:ring-2 focus-within:ring-lumio-primary ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-lumio-primary-light px-2 py-0.5 text-xs font-medium text-lumio-text"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="ml-0.5 rounded-full p-0.5 text-lumio-text-secondary hover:text-lumio-text"
              aria-label={`Remove ${tag}`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-sm text-lumio-text placeholder:text-lumio-text-secondary/50 focus:outline-none"
      />
    </div>
  );
}
