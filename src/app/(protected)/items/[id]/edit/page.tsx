import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ItemForm } from '@/components/items/ItemForm';

export default async function EditItemPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const item = await db.item.findFirst({
    where: { id: params.id, userId: session!.user!.id! },
    include: { attachments: true },
  });
  if (!item) notFound();

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Link href={`/items/${item.id}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <span className="font-display text-base font-bold">Edit item</span>
        </div>
      </div>
      <ItemForm
        mode="edit"
        itemId={item.id}
        initial={{
          name: item.name,
          categoryId: item.categoryId,
          purchaseDate: item.purchaseDate?.toISOString() ?? null,
          price: item.price ? Number(item.price) : null,
          warrantyExpiration: item.warrantyExpiration?.toISOString() ?? null,
          serialNumber: item.serialNumber,
          location: item.location,
          notes: item.notes,
          attachments: item.attachments.map((a) => ({
            id: a.id,
            blobUrl: a.blobUrl,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
            type: a.type,
          })),
        }}
      />
    </div>
  );
}
