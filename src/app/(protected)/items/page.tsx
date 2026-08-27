'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Category {
  id: string;
  name: string;
}
interface Item {
  id: string;
  name: string;
  price: string | number | null;
  warrantyExpiration: string | null;
  category: { name: string };
}

export default function ItemsPage() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [expiringOnly, setExpiringOnly] = useState(searchParams.get('warrantyExpiringThisMonth') === '1');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategoryId) params.set('categoryId', activeCategoryId);
    if (search) params.set('search', search);
    if (expiringOnly) params.set('warrantyExpiringThisMonth', '1');
    const res = await fetch(`/api/items?${params.toString()}`);
    setItems(await res.json());
    setLoading(false);
  }, [activeCategoryId, search, expiringOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="pb-24">
      <div className="border-b border-border px-4 py-3.5">
        <span className="font-display text-base font-bold">Items</span>
      </div>

      <div className="mx-auto flex max-w-content flex-col gap-3.5 p-4">
        <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or serial number"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-secondary"
          />
        </div>

        <div className="flex flex-wrap gap-2 pb-0.5">
          <Chip active={!activeCategoryId && !expiringOnly} onClick={() => { setActiveCategoryId(''); setExpiringOnly(false); }}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={activeCategoryId === c.id} onClick={() => { setActiveCategoryId(c.id); setExpiringOnly(false); }}>
              {c.name}
            </Chip>
          ))}
          <Chip active={expiringOnly} onClick={() => { setExpiringOnly(true); setActiveCategoryId(''); }}>
            Expiring
          </Chip>
        </div>

        <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2 sm:gap-3">
          {!loading && items.length === 0 && (
            <div className="col-span-2 flex flex-col items-center gap-2.5 py-10 text-center text-text-secondary">
              <span className="text-sm">No items match here yet.</span>
              <Link href="/items/new" className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-text">
                + Add item
              </Link>
            </div>
          )}
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
            >
              <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-border" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{item.name}</span>
                <span className="truncate text-[11.5px] text-text-secondary">
                  {item.category.name}
                  {item.warrantyExpiration ? ` · warranty exp. ${new Date(item.warrantyExpiration).toLocaleDateString()}` : ' · no warranty on file'}
                </span>
              </div>
              {item.price != null && <span className="text-sm font-semibold">${Number(item.price).toLocaleString()}</span>}
            </Link>
          ))}
        </div>
      </div>

      <Link
        href="/items/new"
        aria-label="Add item"
        className="fixed bottom-[88px] right-5 flex items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg"
        style={{ width: 52, height: 52 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${
        active ? 'border-accent bg-accent text-accent-ink' : 'border-border bg-surface text-text'
      }`}
      style={{ height: 34 }}
    >
      {children}
    </button>
  );
}
