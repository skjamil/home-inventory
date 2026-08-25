export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex items-center justify-center gap-2 px-5 pb-1 pt-7">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        <span className="font-display text-base font-bold">Home Inventory</span>
      </div>
      <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center px-6 pb-12 pt-5">
        {children}
      </div>
    </div>
  );
}
