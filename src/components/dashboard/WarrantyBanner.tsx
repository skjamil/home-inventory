'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ExpiringItem {
  id: string;
  name: string;
  warrantyExpiration: string | null;
}

export function WarrantyBanner({ items }: { items: ExpiringItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const label = `${items.length} ${items.length === 1 ? 'warranty' : 'warranties'} expire this month`;

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
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="flex justify-between border-t border-border px-3.5 py-2.5 text-xs"
            >
              <span>{item.name}</span>
              <span className="text-text-secondary">
                {item.warrantyExpiration ? new Date(item.warrantyExpiration).toLocaleDateString() : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
