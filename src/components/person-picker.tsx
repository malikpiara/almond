import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// People shown on focus, before you type: the most recently seen.
const RECENT = 6;

/**
 * Inline autocomplete for adding a person. Focus shows recent people, typing
 * narrows to matches (prefix matches first, ignoring case, so "ana" offers the
 * existing "Ana" rather than a new name), and an "Add" row covers someone new.
 * A pick closes the list so the person can be seen landing on the page; focus
 * stays in the field, and typing, a click or the down arrow reopens it.
 */
export function PersonPicker({
  known,
  exclude,
  onPick,
  placeholder,
}: {
  known: string[]; // most recently seen first
  exclude: string[];
  onPick: (name: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const q = query.trim();
  const needle = q.toLowerCase();
  const available = known.filter((n) => !exclude.includes(n));
  const matches = needle
    ? available
        .filter((n) => n.toLowerCase().includes(needle))
        .sort(
          (a, b) =>
            Number(!a.toLowerCase().startsWith(needle)) -
            Number(!b.toLowerCase().startsWith(needle))
        )
    : available.slice(0, RECENT);
  const showAdd = q.length > 0 && !known.some((n) => n.toLowerCase() === needle);
  const showList = open && (matches.length > 0 || showAdd);

  function pick(name: string) {
    onPick(name);
    setQuery('');
    setOpen(false);
  }

  return (
    <Command
      shouldFilter={false}
      loop
      className='relative'
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
        if (e.key === 'ArrowDown') setOpen(true);
      }}
    >
      <CommandInput
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        aria-label='Add a person'
      />
      {showList && (
        <CommandList
          // Keep focus in the input while picking, so the tap lands on the item
          // instead of blurring the field first.
          onMouseDown={(e) => e.preventDefault()}
          className='absolute top-full right-0 left-0 z-20 mt-1'
        >
          {matches.map((name) => (
            <CommandItem key={name} value={name} onSelect={() => pick(name)}>
              {name}
            </CommandItem>
          ))}
          {showAdd && (
            <CommandItem value={`add:${q}`} onSelect={() => pick(q)}>
              <Plus />
              Add “{q}”
            </CommandItem>
          )}
        </CommandList>
      )}
    </Command>
  );
}
