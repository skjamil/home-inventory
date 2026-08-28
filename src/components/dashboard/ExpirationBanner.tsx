'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface ExpiringEntry {
  key: string;
  itemId: string;
  itemName: string;
  date: string | null;
  kind: 'warranty' | 'amc';
}

export function ExpirationBanner({ entries }: { entries: ExpiringEntry[] }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  const warrantyCount = entries.filter((e) => e.kind === 'warranty').length;
  const amcCount = entries.filter((e) => e.kind === 'amc').length;
  const parts: string[] = [];
  if (warrantyCount) parts.push(`${warrantyCount} ${warrantyCount === 1 ? 'warranty' : 'warranties'}`);
  if (amcCount) parts.push(`${amcCount} ${amcCount === 1 ? 'AMC' : 'AMCs'}`);
  const label = `${parts.join(' + ')} expire${entries.length === 1 ? 's' : ''} this month`;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2.5 bg-warn-bg px-3.5 py-3 text-warn-text"
      >
        <span className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 9v4M12 17h.01M10.3 3.9L2.7 18a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
          <span className="text-sm font-semibold">{label}</span>
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col">
          {entries.map((entry) => (
            <Link
              key={entry.key}
              href={`/items/${entry.itemId}`}
              className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{entry.itemName}</span>
                <span className="flex-shrink-0 text-[10px] font-semibold uppercase text-text-secondary">
                  {entry.kind === 'warranty' ? 'Warranty' : 'AMC'}
                </span>
              </span>
              <span className="flex-shrink-0 text-text-secondary">{entry.date ? new Date(entry.date).toLocaleDateString() : ''}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
