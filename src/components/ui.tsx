import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Small typed UI primitives used across the app.
// ============================================================================

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`card ${onClick ? 'text-left w-full hover:shadow-lift transition' : ''} ${className}`}
    >
      {children}
    </Wrapper>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'huge' | 'white';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  ariaLabel,
  type = 'button',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
  size?: 'md' | 'lg' | 'xl';
}) {
  const sizeCls =
    size === 'xl' ? 'text-2xl px-8 py-6 rounded-3xl' : size === 'lg' ? 'text-xl px-7 py-5 rounded-2xl' : 'text-lg px-6 py-4 rounded-2xl';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${variant === 'huge' ? 'btn-huge' : variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : variant === 'ghost' ? 'btn-ghost' : variant === 'danger' ? 'btn-danger' : 'btn bg-white text-brand-800 hover:bg-brand-50 shadow-card'} ${sizeCls} ${className}`}
    >
      {children}
    </button>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 10,
  color = '#638c52',
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={label ?? `${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7eee2" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center font-extrabold text-brand-800" style={{ fontSize: size / 3.6 }}>
        {Math.round(value)}%
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  trend?: { up?: boolean; text?: string };
}) {
  return (
    <Card className="flex flex-col gap-1 items-start">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-bold text-brand-600 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-extrabold text-brand-900">{value}</div>
      {hint && <div className="text-sm text-neutral-500">{hint}</div>}
      {trend && (
        <div className={`text-sm font-bold ${trend.up ? 'text-brand-600' : 'text-accent-500'}`}>
          {trend.up ? '↑' : '↓'} {trend.text}
        </div>
      )}
    </Card>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1"
      role="switch"
      aria-checked={checked}
    >
      <span className="text-lg font-semibold">{label}</span>
      <span className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${checked ? 'bg-brand-500' : 'bg-neutral-200'}`}>
        <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
      </span>
    </button>
  );
}

export function Chip({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'warm' | 'accent' | 'neutral' }) {
  const tones = {
    brand: 'bg-brand-100 text-brand-800',
    warm: 'bg-warm-100 text-warm-500',
    accent: 'bg-accent-50 text-accent-400',
    neutral: 'bg-neutral-100 text-neutral-600',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function SectionTitle({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <h2 className="mt-6 mb-3 flex items-center gap-2 text-xl font-extrabold text-brand-900">
      {icon && <span>{icon}</span>}
      {children}
    </h2>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-warm-200 bg-warm-50 p-4 text-sm font-semibold text-brand-800">
      ⚕️ {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift pop"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-2xl font-extrabold text-brand-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-neutral-100 p-2 text-xl hover:bg-neutral-200">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'info' | 'warn' }) {
  const tones = {
    success: 'bg-brand-700 text-white',
    info: 'bg-brand-600 text-white',
    warn: 'bg-warm-500 text-white',
  };
  return createPortal(
    <div className="fixed left-1/2 top-6 z-[60] -translate-x-1/2">
      <div className={`pop rounded-2xl px-5 py-3 text-lg font-bold shadow-lift ${tones[tone]}`}>{message}</div>
    </div>,
    document.body,
  );
}

export function EmojiView({ name }: { name: string }) {
  // Fallback "objects" rendered as large emoji tiles for memory games.
  return (
    <div className="flex h-full w-full items-center justify-center text-5xl" aria-hidden>
      <span>{name}</span>
    </div>
  );
}