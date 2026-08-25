import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

const variants = {
  primary: 'bg-accent text-accent-ink hover:opacity-90 disabled:opacity-45',
  ghost: 'border border-border bg-transparent text-text hover:bg-surface disabled:opacity-45',
  danger: 'border border-warn-text bg-transparent text-warn-text hover:bg-warn-bg disabled:opacity-45',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`h-11 w-full rounded-lg text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
