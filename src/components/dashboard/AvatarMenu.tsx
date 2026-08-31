'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';

interface Props {
  name: string | null;
  image: string | null;
}

export function AvatarMenu({ name, image }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-border"
      >
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-text-secondary">
            {(name ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-semibold text-text hover:bg-bg"
          >
            Profile
          </Link>
          <button
            disabled={loggingOut}
            onClick={() => {
              setLoggingOut(true);
              signOut({ callbackUrl: '/login' });
            }}
            className="block w-full px-3.5 py-2.5 text-left text-sm font-semibold text-warn-text hover:bg-bg disabled:opacity-45"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
