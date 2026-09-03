'use client';

import { useEffect, useState } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  itemCount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories);
  }
  useEffect(load, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewName('');
      load();
      flash('Category added');
    } else {
      const body = await res.json().catch(() => null);
      flash(body?.error?.message ?? 'Could not add category');
    }
  }

  async function saveRename(id: string) {
    const name = editValue.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setEditingId(null);
      load();
      flash('Category renamed');
    } else {
      const body = await res.json().catch(() => null);
      flash(body?.error?.message ?? 'Could not rename category');
    }
  }

  function cancelRename() {
    setEditingId(null);
    setEditValue('');
  }

  function requestDelete(cat: Category) {
    if (cat.itemCount > 0) {
      flash('Reassign or delete its items first');
      return;
    }
    setConfirmingDelete(cat);
  }

  async function confirmDelete() {
    if (!confirmingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/categories/${confirmingDelete.id}`, { method: 'DELETE' });
    setDeleting(false);
    setConfirmingDelete(null);
    if (res.ok) {
      load();
      flash('Category deleted');
    }
  }

  return (
    <div className="pb-24">
      <div className="border-b border-border px-4 py-3.5">
        <span className="font-display text-base font-bold">Categories</span>
      </div>

      <div className="mx-auto flex max-w-content flex-col gap-4 p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Add a category…"
            className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-base sm:text-sm"
          />
          <button onClick={addCategory} className="rounded-lg border border-border px-4 text-xs font-semibold">
            Add
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
              <CategoryIcon icon={c.icon} className="h-5 w-5 flex-shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                {editingId === c.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(c.id);
                      if (e.key === 'Escape') cancelRename();
                    }}
                    className="w-full min-w-0 border-b border-dashed border-accent bg-transparent text-base font-semibold outline-none sm:text-sm"
                  />
                ) : (
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                )}
                <span className="text-xs text-text-secondary">{c.itemCount} items</span>
              </div>
              {editingId === c.id ? (
                <>
                  <button onClick={() => saveRename(c.id)} aria-label="Save" className="flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                  <button onClick={cancelRename} aria-label="Cancel" className="flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditValue(c.name);
                    }}
                    aria-label="Rename"
                    className="flex-shrink-0"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button onClick={() => requestDelete(c)} aria-label="Delete" className="flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-text-secondary">
          Every new account starts with five default categories. Categories with items can&apos;t be deleted until those items are reassigned.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-lg bg-text px-4 py-2.5 text-xs font-semibold text-bg">
          {toast}
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-5">
          <div className="flex w-full max-w-[340px] flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5">
            <span className="font-display text-base font-bold">Delete this category?</span>
            <p className="text-sm text-text-secondary">
              &quot;{confirmingDelete.name}&quot; will be removed. This can&apos;t be undone.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmingDelete(null)} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold">
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={confirmDelete}
                className="h-11 flex-1 rounded-lg border border-warn-text text-sm font-semibold text-warn-text"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
