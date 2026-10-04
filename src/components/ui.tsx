import { useState, type ReactNode } from 'react'

export function Badge({
  children,
  tone = 'slate'
}: {
  children: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'brand'
}): JSX.Element {
  const styles: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    brand: 'bg-brand-100 text-brand-700'
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon
}: {
  label: string
  value: string | number
  hint?: string
  icon?: string
}): JSX.Element {
  return (
    <div className="card flex items-center gap-4 p-5">
      {icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg text-brand-600">
          <i className={icon} aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        {hint && <div className="truncate text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  )
}

/** Product preview image with a branded fallback when the URL is missing/broken. */
export function Thumb({
  src,
  alt,
  className = '',
  iconClass = 'fa-solid fa-toolbox text-3xl'
}: {
  src?: string | null
  alt: string
  className?: string
  iconClass?: string
}): JSX.Element {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-brand-600 to-violet-600 text-white ${className}`}
        aria-hidden="true"
      >
        <i className={iconClass} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`bg-slate-100 object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {label}
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail?: string }): JSX.Element {
  return (
    <div className="card p-10 text-center">
      <div className="text-3xl text-slate-300">
        <i className="fa-solid fa-box-open" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      {detail && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{detail}</p>}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}): JSX.Element | null {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }): JSX.Element {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
