'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Persistent bottom tab bar across the four root screens — the concrete
// realization of the nav docs/DESIGN.md's Dashboard section calls for
// ("a nav to Items / Categories / Settings").
const TABS = [
  { href: '/dashboard', label: 'Home', icon: 'M4 11l8-7 8 7M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9' },
  { href: '/items', label: 'Items', icon: 'M8 6h12M8 12h12M8 18h12' },
  { href: '/categories', label: 'Categories', icon: '' },
  { href: '/settings', label: 'Settings', icon: '' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-content">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-semibold ${
                active ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              <TabIcon name={tab.label} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TabIcon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9 };
  if (name === 'Home')
    return (
      <svg {...common}>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9" />
      </svg>
    );
  if (name === 'Items')
    return (
      <svg {...common}>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <circle cx="4" cy="6" r="1.3" />
        <circle cx="4" cy="12" r="1.3" />
        <circle cx="4" cy="18" r="1.3" />
      </svg>
    );
  if (name === 'Categories')
    return (
      <svg {...common}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  return (
    <svg {...common}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}
