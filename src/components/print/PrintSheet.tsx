import React from 'react'

interface PrintSheetProps {
  children: React.ReactNode
  orientation?: 'portrait' | 'landscape'
  className?: string
}

export const PrintSheet: React.FC<PrintSheetProps> = ({ children, orientation = 'portrait', className = '' }) =>
  <section className={`print-area ${orientation === 'landscape' ? 'print-landscape' : 'print-portrait'} ${className}`}>
    <div className="print-paper">{children}</div>
  </section>

export const PrintTips: React.FC<{ card?: boolean }> = ({ card = false }) =>
  <aside className="print-tips no-print mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
    <strong className="text-white">Tips cetak:</strong> A4, skala 100%, margin Default{card ? ', kertas minimal 150–200 gsm' : ''}.
  </aside>
