import Link from 'next/link';
import { ItemForm } from '@/components/items/ItemForm';

export default function NewItemPage() {
  return (
    <div className="pb-24">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Link href="/items">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <span className="font-display text-base font-bold">Add item</span>
        </div>
      </div>
      <ItemForm mode="create" />
    </div>
  );
}
