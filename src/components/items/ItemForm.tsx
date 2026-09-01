'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { FileCaptureInput } from '@/components/upload/FileCaptureInput';
import { AmcContractsField, type AmcContractDraft } from '@/components/items/AmcContractsField';
import { scanReceipt } from '@/lib/receipt-scan';
import type { UploadedFile } from '@/lib/upload-client';

interface Category {
  id: string;
  name: string;
}
interface Attachment extends UploadedFile {
  id?: string;
}
interface InitialAmcContract {
  id: string;
  provider: string;
  cost: number | string | null;
  startDate: string | null;
  endDate: string | null;
  documentBlobUrl: string | null;
  documentFileName: string | null;
  documentMimeType: string | null;
  documentSizeBytes: number | null;
}
interface ItemFormProps {
  mode: 'create' | 'edit';
  itemId?: string;
  initial?: {
    name: string;
    categoryId: string;
    purchaseDate: string | null;
    price: number | string | null;
    warrantyExpiration: string | null;
    serialNumber: string | null;
    location: string | null;
    notes: string | null;
    attachments: Attachment[];
    amcContracts: InitialAmcContract[];
  };
}

export function ItemForm({ mode, itemId, initial }: ItemFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [purchaseDate, setPurchaseDate] = useState(toDateInput(initial?.purchaseDate));
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [warranty, setWarranty] = useState(toDateInput(initial?.warrantyExpiration));
  const [serial, setSerial] = useState(initial?.serialNumber ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const existing = initial?.attachments ?? [];
  const [photos, setPhotos] = useState<Attachment[]>(existing.filter((a) => a.type === 'PHOTO'));
  const [receipt, setReceipt] = useState<Attachment[]>(existing.filter((a) => a.type === 'RECEIPT'));
  const [warrantyDoc, setWarrantyDoc] = useState<Attachment[]>(existing.filter((a) => a.type === 'WARRANTY'));

  const [amcContracts, setAmcContracts] = useState<AmcContractDraft[]>(
    (initial?.amcContracts ?? []).map((c) => ({
      _key: c.id,
      id: c.id,
      provider: c.provider,
      cost: c.cost != null ? String(c.cost) : '',
      startDate: toDateInput(c.startDate),
      endDate: toDateInput(c.endDate),
      documentBlobUrl: c.documentBlobUrl,
      documentFileName: c.documentFileName,
      documentMimeType: c.documentMimeType,
      documentSizeBytes: c.documentSizeBytes,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((cats: Category[]) => {
        setCategories(cats);
        if (!categoryId && cats[0]) setCategoryId(cats[0].id);
      });
  }, [categoryId]);

  async function addCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryError(null);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((c) => [...c, cat]);
      setCategoryId(cat.id);
      setNewCategoryName('');
      setAddingCategory(false);
    } else {
      const body = await res.json().catch(() => null);
      setCategoryError(body?.error?.message ?? 'Could not add category');
    }
  }

  // In edit mode the item already exists, so a newly captured file is linked
  // immediately and a removed one is unlinked immediately; in create mode
  // everything is just held in local state until the item is created (see
  // the "File upload" flow in docs/ARCHITECTURE.md).
  async function handleAttachmentChange(newList: Attachment[], prevList: Attachment[], setList: (a: Attachment[]) => void) {
    if (mode !== 'edit' || !itemId) {
      setList(newList);
      return;
    }

    const removed = prevList.filter((a) => a.id && !newList.includes(a));
    await Promise.all(removed.map((a) => fetch(`/api/items/${itemId}/attachments/${a.id}`, { method: 'DELETE' })));

    const unlinked = newList.filter((a) => !a.id);
    const linked = await Promise.all(
      unlinked.map(async (a) => {
        const res = await fetch(`/api/items/${itemId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(a),
        });
        return res.ok ? await res.json() : a;
      })
    );
    setList([...newList.filter((a) => a.id), ...linked]);
  }

  // Best-effort client-side OCR on a newly captured receipt — only fills
  // fields the user hasn't already typed, never overwrites. See "Receipt
  // scan auto-fill" in docs/DESIGN.md.
  async function runReceiptScan(url: string) {
    setScanning(true);
    setScanNotice(null);
    try {
      const result = await scanReceipt(url);
      let filledAny = false;
      if (!name.trim() && result.name) {
        setName(result.name);
        filledAny = true;
      }
      if (!price && result.price != null) {
        setPrice(String(result.price));
        filledAny = true;
      }
      if (!purchaseDate && result.purchaseDate) {
        setPurchaseDate(result.purchaseDate);
        filledAny = true;
      }
      if (filledAny) setScanNotice('Auto-filled from the receipt — please review before saving.');
    } finally {
      setScanning(false);
    }
  }

  const canSave = name.trim().length > 0 && categoryId.length > 0 && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      categoryId,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : null,
      price: price ? Number(price) : null,
      warrantyExpiration: warranty ? new Date(warranty).toISOString() : null,
      serialNumber: serial || null,
      location: location || null,
      notes: notes || null,
      ...(mode === 'create'
        ? {
            attachments: [...photos, ...receipt, ...warrantyDoc],
            amcContracts: amcContracts.map((c) => ({
              provider: c.provider,
              cost: c.cost ? Number(c.cost) : null,
              startDate: c.startDate ? new Date(c.startDate).toISOString() : null,
              endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
              documentBlobUrl: c.documentBlobUrl,
              documentFileName: c.documentFileName,
              documentMimeType: c.documentMimeType,
              documentSizeBytes: c.documentSizeBytes,
            })),
          }
        : {}),
    };

    const res =
      mode === 'create'
        ? await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`/api/items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    setSaving(false);
    if (!res.ok) return;
    const item = await res.json();
    router.push(`/items/${item.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-content flex-col gap-4 p-4 pb-28">
      <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sony A7 IV Camera" />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-text-secondary">Category</span>
        {addingCategory ? (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setCategoryError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                placeholder="New category name"
                className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-base sm:text-sm"
              />
              <button type="button" onClick={addCategory} className="rounded-lg border border-border px-3 text-xs font-semibold">
                Add
              </button>
            </div>
            {categoryError && <span className="text-xs text-warn-text">{categoryError}</span>}
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => {
              if (e.target.value === '__add__') setAddingCategory(true);
              else setCategoryId(e.target.value);
            }}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-base sm:text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__add__">+ Add new category…</option>
          </select>
        )}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Purchase date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        <Field label="Price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
      </div>
      <Field label="Warranty expiration" type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Serial number" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Optional" />
        <Field label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Office shelf" />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-text-secondary">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional"
          className="w-full rounded-lg border border-border bg-surface p-3 text-base placeholder:text-text-secondary sm:text-sm"
        />
      </label>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Photos</span>
        <FileCaptureInput type="PHOTO" multiple value={photos} onChange={(list) => handleAttachmentChange(list, photos, setPhotos)} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Receipt</span>
        <FileCaptureInput
          type="RECEIPT"
          value={receipt}
          onChange={(list) => {
            handleAttachmentChange(list, receipt, setReceipt);
            if (list[0] && list[0].blobUrl !== receipt[0]?.blobUrl) runReceiptScan(list[0].blobUrl);
          }}
        />
        {scanning && <span className="text-xs text-text-secondary">Scanning receipt…</span>}
        {scanNotice && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-accent/10 p-2.5 text-xs text-accent">
            <span>{scanNotice}</span>
            <button type="button" onClick={() => setScanNotice(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Warranty document</span>
        <FileCaptureInput type="WARRANTY" value={warrantyDoc} onChange={(list) => handleAttachmentChange(list, warrantyDoc, setWarrantyDoc)} />
      </div>

      <div className="h-px bg-border" />

      <AmcContractsField mode={mode} itemId={itemId} value={amcContracts} onChange={setAmcContracts} />

      <Button type="submit" disabled={!canSave} className="mt-2">
        {saving ? 'Saving…' : 'Save item'}
      </Button>
    </form>
  );
}

function toDateInput(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}
