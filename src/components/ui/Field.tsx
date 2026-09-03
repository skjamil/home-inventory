import { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, ...props }: FieldProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      <input
        id={id}
        className="h-11 min-w-0 rounded-lg border border-border bg-surface px-3 text-base text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm"
        {...props}
      />
    </label>
  );
}
