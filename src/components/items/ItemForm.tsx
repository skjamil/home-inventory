'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { FileCaptureInput } from '@/components/upload/FileCaptureInput';
import type { UploadedFile } from '@/lib/upload-client';

interface Category {
  id: string;
  name: string;
}
interface Attachment extends UploadedFile {
  id?: string;
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
  };
}

export function ItemForm({ mode, itemId, initial }: ItemFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const [saving, setSaving] = useState(false);

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
      ...(mode === 'create' ? { attachments: [...photos, ...receipt, ...warrantyDoc] } : {}),
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
          <div className="flex gap-2">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="New category name"
              className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
            />
            <button type="button" onClick={addCategory} className="rounded-lg border border-border px-3 text-xs font-semibold">
              Add
            </button>
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => {
              if (e.target.value === '__add__') setAddingCategory(true);
              else setCategoryId(e.target.value);
            }}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        <Field label="Price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
      </div>
      <Field label="Warranty expiration" type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
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
          className="w-full rounded-lg border border-border bg-surface p-3 text-sm placeholder:text-text-secondary"
        />
      </label>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Photos</span>
        <FileCaptureInput type="PHOTO" multiple value={photos} onChange={(list) => handleAttachmentChange(list, photos, setPhotos)} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Receipt</span>
        <FileCaptureInput type="RECEIPT" value={receipt} onChange={(list) => handleAttachmentChange(list, receipt, setReceipt)} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Warranty document</span>
        <FileCaptureInput type="WARRANTY" value={warrantyDoc} onChange={(list) => handleAttachmentChange(list, warrantyDoc, setWarrantyDoc)} />
      </div>

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
