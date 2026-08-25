import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DeleteItemButton } from '@/components/items/DeleteItemButton';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const item = await db.item.findFirst({
    where: { id: params.id, userId: session!.user!.id! },
    include: { attachments: true, category: { select: { name: true } } },
  });
  if (!item) notFound();

  const photos = item.attachments.filter((a) => a.type === 'PHOTO');
  const receipt = item.attachments.find((a) => a.type === 'RECEIPT');
  const warrantyDoc = item.attachments.find((a) => a.type === 'WARRANTY');

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Link href="/items">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <span className="font-display text-base font-bold">Item</span>
        </div>
        <div className="flex gap-3.5">
          <Link href={`/items/${item.id}/edit`} aria-label="Edit item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </Link>
          <DeleteItemButton itemId={item.id} itemName={item.name} />
        </div>
      </div>

      <div className="mx-auto max-w-content p-4">
        <div style={{ marginBottom: 18 }}>
          <h1 className="font-display text-xl font-extrabold">{item.name}</h1>
          <span className="text-xs text-text-secondary">{item.category.name}</span>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col gap-4 sm:w-60 sm:flex-shrink-0">
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.blobUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary">
                No photos yet — tap Edit to add some.
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Documents</span>
              <AttachmentRow attachment={receipt} label="receipt" />
              <AttachmentRow attachment={warrantyDoc} label="warranty document" />
            </div>
          </div>

          <div className="flex-1">
            <Row label="Purchase date" value={item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '—'} first />
            <Row label="Price" value={item.price != null ? `$${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'} />
            <Row
              label="Warranty expiration"
              value={item.warrantyExpiration ? new Date(item.warrantyExpiration).toLocaleDateString() : '—'}
              warn={!!item.warrantyExpiration}
            />
            <Row label="Serial number" value={item.serialNumber || '—'} />
            <Row label="Location" value={item.location || '—'} />
            {item.notes && <Row label="Notes" value={item.notes} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, warn, first }: { label: string; value: string; warn?: boolean; first?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-2.5 text-sm ${first ? '' : 'border-t border-border'}`}>
      <span className="text-text-secondary">{label}</span>
      <span className={`text-right font-semibold ${warn ? 'text-warn-text' : ''}`}>{value}</span>
    </div>
  );
}

function AttachmentRow({ attachment, label }: { attachment?: { blobUrl: string; fileName: string }; label: string }) {
  if (!attachment) return <span className="text-xs text-text-secondary">No {label} on file.</span>;
  return (
    <a href={attachment.blobUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-3">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" className="flex-shrink-0">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="truncate text-xs font-semibold">{attachment.fileName}</span>
    </a>
  );
}
