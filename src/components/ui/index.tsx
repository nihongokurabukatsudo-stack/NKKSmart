import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-pink-600 text-white hover:bg-pink-500',
    secondary: 'border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700',
    danger: 'bg-rose-700 text-white hover:bg-rose-600',
    ghost: 'text-slate-200 hover:bg-white/10',
  }
  return <button type="button" {...props} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`} />
}

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) =>
  <div {...props} className={`rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5 text-slate-100 shadow-lg shadow-black/10 ${className}`} />

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) =>
  <input {...props} className={`min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 ${className}`} />

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: 'pink' | 'red' | 'neutral' }> = ({ tone = 'neutral', className = '', ...props }) => {
  const tones = { pink: 'border-pink-500/30 bg-pink-500/15 text-pink-200', red: 'border-rose-500/30 bg-rose-500/15 text-rose-200', neutral: 'border-slate-600 bg-slate-800 text-slate-200' }
  return <span {...props} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`} />
}

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className = '', ...props }) =>
  <div className="responsive-table-wrap overflow-x-auto rounded-xl border border-slate-700"><table {...props} data-responsive-cards="true" className={`w-full border-collapse text-left text-sm ${className}`} /></div>

interface OverlayProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }
const Overlay: React.FC<OverlayProps & { side?: 'center' | 'bottom' }> = ({ open, onClose, title, children, className = '', side = 'center' }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-label={title} className={`w-full border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl ${side === 'bottom' ? 'mt-auto max-h-[90dvh] rounded-t-3xl sm:mx-auto sm:mt-0 sm:max-w-lg sm:rounded-3xl' : 'max-w-lg rounded-3xl'} ${className}`}>
      <header className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold">{title}</h2><Button variant="ghost" aria-label="Tutup" onClick={onClose} className="min-w-11 px-2"><X size={18}/></Button></header>
      {children}
    </section>
  </div>
}
export const Modal: React.FC<OverlayProps> = (props) => <Overlay {...props} />
export const Drawer: React.FC<OverlayProps> = (props) => <Overlay {...props} side="bottom" />

export const Tabs: React.FC<{ tabs: Array<{ id: string; label: string }>; value: string; onChange: (id: string) => void }> = ({ tabs, value, onChange }) =>
  <div role="tablist" className="flex flex-wrap gap-2 border-b border-slate-700">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)} className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${value === tab.id ? 'border-pink-400 text-pink-300' : 'border-transparent text-slate-400 hover:text-white'}`}>{tab.label}</button>)}</div>

export const Toast: React.FC<{ message: string; tone?: 'success' | 'error'; onClose?: () => void }> = ({ message, tone = 'success', onClose }) =>
  <div role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${tone === 'error' ? 'border-rose-500/30 bg-rose-950/80 text-rose-100' : 'border-pink-500/30 bg-pink-950/80 text-pink-100'}`}>
    {tone === 'error' && <AlertTriangle size={16}/>}<span className="flex-1">{message}</span>{onClose && <Button variant="ghost" aria-label="Tutup pesan" onClick={onClose} className="min-w-11 px-2"><X size={16}/></Button>}
  </div>

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-700/70 ${className}`} />

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) =>
  <div className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-300"><h3 className="font-semibold text-white">{title}</h3>{description && <p className="mt-2 text-sm">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>

export const ConfirmDialog: React.FC<OverlayProps & { confirmLabel?: string; onConfirm: () => void; busy?: boolean }> = ({ children, confirmLabel = 'Konfirmasi', onConfirm, busy = false, ...modalProps }) =>
  <Modal {...modalProps}><div className="text-sm text-slate-300">{children}</div><footer className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={modalProps.onClose}>Batal</Button><Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Memproses…' : confirmLabel}</Button></footer></Modal>
