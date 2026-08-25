const PATHS: Record<string, string> = {
  electronics: 'M9 7V4M15 7V4M9 20v-2M15 20v-2',
  furniture: 'M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M6 17v2M18 17v2',
  tools: 'M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.3 2.3-2-2 2.3-2.3z',
  kitchen: 'M7 3v6a2 2 0 002 2v10M7 3v6M9 3v6M16 3c-1.4 0-2.5 1.6-2.5 4.5S14.6 12 16 12v9',
  storage: 'M3 8l9-5 9 5-9 5-9-5zM3 8v9l9 5m0-14v14m9-14v9l-9 5',
};

export function CategoryIcon({ icon, className = 'h-5 w-5' }: { icon?: string | null; className?: string }) {
  const key = (icon ?? '').toLowerCase();
  const path = PATHS[key];

  if (!path) {
    // Generic tag icon for custom, non-default categories.
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6">
        <path d="M4 4h8l8 8-9 9-8-8V4z" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6">
      {key === 'electronics' && <rect x="6" y="7" width="12" height="9" rx="2" />}
      {key === 'furniture' && <rect x="4" y="11" width="16" height="6" rx="1.5" />}
      <path d={path} />
    </svg>
  );
}
