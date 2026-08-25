'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteItemButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (confirming) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-5">
        <div className="flex w-full max-w-[340px] flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5">
          <span className="font-display text-base font-bold">Delete this item?</span>
          <p className="text-sm text-text-secondary">
            &quot;{itemName}&quot; and its photos, receipt, and warranty document will be removed. This can&apos;t be undone.
          </p>
          <div className="flex gap-2.5">
            <button onClick={() => setConfirming(false)} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold">
              Cancel
            </button>
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
                router.push('/items');
              }}
              className="h-11 flex-1 rounded-lg border border-warn-text text-sm font-semibold text-warn-text"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} aria-label="Delete item">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn-text)" strokeWidth="2">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      </svg>
    </button>
  );
}
