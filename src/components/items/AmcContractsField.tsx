'use client';

import { useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { FileCaptureInput } from '@/components/upload/FileCaptureInput';
import type { UploadedFile } from '@/lib/upload-client';

export interface AmcContractDraft {
  _key: string;
  id?: string;
  provider: string;
  cost: string;
  startDate: string;
  endDate: string;
  documentBlobUrl: string | null;
  documentFileName: string | null;
  documentMimeType: string | null;
  documentSizeBytes: number | null;
}

interface AmcContractsFieldProps {
  mode: 'create' | 'edit';
  itemId?: string;
  value: AmcContractDraft[];
  onChange: (list: AmcContractDraft[]) => void;
}

const NEW_KEY = '__new__';

// AMC contracts are the first repeatable, independently-editable child
// records in this app (Photos/Receipt/Warranty are just attach/detach of an
// opaque file). Each contract is added/edited with an explicit Save/Cancel —
// not blur-to-save like Categories' rename — since it's a multi-field form.
// A new contract is only appended to `value` on Save, never while a blank
// draft is still open, so an in-progress add can't leak into the item save.
export function AmcContractsField({ mode, itemId, value, onChange }: AmcContractsFieldProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<AmcContractDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setDraft({
      _key: crypto.randomUUID(),
      provider: '',
      cost: '',
      startDate: '',
      endDate: '',
      documentBlobUrl: null,
      documentFileName: null,
      documentMimeType: null,
      documentSizeBytes: null,
    });
    setEditingKey(NEW_KEY);
    setError(null);
  }

  function startEdit(c: AmcContractDraft) {
    setDraft({ ...c });
    setEditingKey(c._key);
    setError(null);
  }

  function cancelEdit() {
    setDraft(null);
    setEditingKey(null);
    setError(null);
  }

  async function saveEdit() {
    if (!draft) return;
    const provider = draft.provider.trim();
    if (!provider) {
      setError('Provider is required');
      return;
    }

    const isNew = editingKey === NEW_KEY;
    const payload = {
      provider,
      cost: draft.cost ? Number(draft.cost) : null,
      startDate: draft.startDate ? new Date(draft.startDate).toISOString() : null,
      endDate: draft.endDate ? new Date(draft.endDate).toISOString() : null,
      documentBlobUrl: draft.documentBlobUrl,
      documentFileName: draft.documentFileName,
      documentMimeType: draft.documentMimeType,
      documentSizeBytes: draft.documentSizeBytes,
    };

    if (mode === 'edit' && itemId) {
      setSaving(true);
      const res = isNew
        ? await fetch(`/api/items/${itemId}/amc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/items/${itemId}/amc/${draft.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      setSaving(false);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? 'Could not save AMC contract');
        return;
      }
      const saved = await res.json();
      const updated = fromServer(saved, draft._key);
      onChange(isNew ? [...value, updated] : value.map((c) => (c._key === draft._key ? updated : c)));
    } else {
      const finalDraft = { ...draft, provider };
      onChange(isNew ? [...value, finalDraft] : value.map((c) => (c._key === draft._key ? finalDraft : c)));
    }

    setDraft(null);
    setEditingKey(null);
    setError(null);
  }

  async function removeContract(c: AmcContractDraft) {
    if (c.id) {
      if (!window.confirm(`Delete the AMC contract with ${c.provider || 'this provider'}?`)) return;
      const res = await fetch(`/api/items/${itemId}/amc/${c.id}`, { method: 'DELETE' });
      if (!res.ok) return;
    }
    onChange(value.filter((x) => x._key !== c._key));
    if (editingKey === c._key) cancelEdit();
  }

  function handleDocumentChange(files: UploadedFile[]) {
    if (!draft) return;
    const f = files[0];
    setDraft({
      ...draft,
      documentBlobUrl: f?.blobUrl ?? null,
      documentFileName: f?.fileName ?? null,
      documentMimeType: f?.mimeType ?? null,
      documentSizeBytes: f?.sizeBytes ?? null,
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary">AMC Contracts</span>
        {!editingKey && (
          <button type="button" onClick={startAdd} className="text-xs font-semibold text-accent">
            + Add contract
          </button>
        )}
      </div>

      {value.length === 0 && !editingKey && <p className="text-xs text-text-secondary">No AMC contracts yet.</p>}

      {value.map((c) =>
        editingKey === c._key && draft ? (
          <ContractEditor
            key={c._key}
            draft={draft}
            setDraft={setDraft}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onDocumentChange={handleDocumentChange}
            saving={saving}
            error={error}
          />
        ) : (
          <ContractCard key={c._key} contract={c} onEdit={() => startEdit(c)} onDelete={() => removeContract(c)} />
        )
      )}

      {editingKey === NEW_KEY && draft && (
        <ContractEditor
          draft={draft}
          setDraft={setDraft}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onDocumentChange={handleDocumentChange}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}

function fromServer(
  saved: {
    id: string;
    provider: string;
    cost: string | number | null;
    startDate: string | null;
    endDate: string | null;
    documentBlobUrl: string | null;
    documentFileName: string | null;
    documentMimeType: string | null;
    documentSizeBytes: number | null;
  },
  key: string
): AmcContractDraft {
  return {
    _key: key,
    id: saved.id,
    provider: saved.provider,
    cost: saved.cost != null ? String(saved.cost) : '',
    startDate: toDateInput(saved.startDate),
    endDate: toDateInput(saved.endDate),
    documentBlobUrl: saved.documentBlobUrl,
    documentFileName: saved.documentFileName,
    documentMimeType: saved.documentMimeType,
    documentSizeBytes: saved.documentSizeBytes,
  };
}

function toDateInput(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function ContractEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDocumentChange,
  saving,
  error,
}: {
  draft: AmcContractDraft;
  setDraft: (d: AmcContractDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDocumentChange: (files: UploadedFile[]) => void;
  saving: boolean;
  error: string | null;
}) {
  const documentValue: UploadedFile[] = draft.documentBlobUrl
    ? [
        {
          blobUrl: draft.documentBlobUrl,
          fileName: draft.documentFileName ?? '',
          mimeType: draft.documentMimeType ?? '',
          sizeBytes: draft.documentSizeBytes ?? 0,
          type: 'AMC_DOCUMENT',
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3.5">
      <Field
        label="Provider"
        required
        value={draft.provider}
        onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
        placeholder="e.g. CoolCare Services"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost" type="number" step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} placeholder="0.00" />
        <Field label="Start date" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
      </div>
      <Field label="End date" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-text-secondary">Contract document</span>
        <FileCaptureInput type="AMC_DOCUMENT" value={documentValue} onChange={onDocumentChange} />
      </div>
      {error && <p className="text-xs text-warn-text">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function ContractCard({ contract, onEdit, onDelete }: { contract: AmcContractDraft; onEdit: () => void; onDelete: () => void }) {
  const warn = !!contract.endDate && differenceInCalendarDays(new Date(contract.endDate), new Date()) <= 30;
  return (
    <div className="rounded-card border border-border bg-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{contract.provider || 'Untitled contract'}</div>
          <div className={`text-xs ${warn ? 'text-warn-text' : 'text-text-secondary'}`}>
            {contract.startDate || '—'} – {contract.endDate || '—'}
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-3">
          <button type="button" onClick={onEdit} aria-label="Edit contract">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button type="button" onClick={onDelete} aria-label="Delete contract">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>
      {contract.cost && <div className="mt-1 text-xs text-text-secondary">${Number(contract.cost).toFixed(2)}</div>}
      {contract.documentBlobUrl && (
        <a
          href={contract.documentBlobUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-2 rounded-lg border border-border p-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" className="flex-shrink-0">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <span className="truncate text-xs font-semibold">{contract.documentFileName}</span>
        </a>
      )}
    </div>
  );
}
