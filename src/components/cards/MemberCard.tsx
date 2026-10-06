import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'

interface MemberCardProps {
  id: number
  nama: string
  kelas: string
  jurusan: string
  nis?: string | null
  kodeUnik: string
  qrValue: string
  jabatan: string
  showActions?: boolean
}

export const MemberCard: React.FC<MemberCardProps> = ({
  id,
  nama,
  kelas,
  jurusan,
  nis,
  kodeUnik,
  qrValue,
  jabatan,
  showActions = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(qrValue || `NKKSMART|MEMBER|${kodeUnik}`, {
      width: 480,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((url) => {
      if (active) setQrDataUrl(url)
    }).catch((err) => console.error('Error generating QR code:', err))
    return () => { active = false }
  }, [qrValue, kodeUnik])

  const nameFontSize = Math.min(12, Math.max(6, Math.floor((440 / Math.max(nama.length, 1)) * 10) / 10))

  return (
    <div className="member-card-wrapper flex flex-col items-center gap-2" data-print-ready={qrDataUrl ? 'true' : 'false'}>
      <article data-member-card-id={id} className="member-card relative h-[54mm] w-[85.6mm] shrink-0 overflow-hidden rounded-[2.5mm] bg-slate-950 text-slate-950 print-color">
        <img src="/img/kartu_bgs.jpg" alt="" aria-hidden="true" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 flex h-full flex-col p-[3mm]">
          <header className="flex min-h-[9mm] items-center justify-between gap-[1mm] rounded-[2mm] bg-white/[0.94] px-[2mm] py-[1mm]">
            <div className="flex min-w-0 items-center gap-[1.5mm]">
              <img src="/img/nkk.png" alt="Logo NKK" width={80} height={80} className="h-[7mm] w-[7mm] shrink-0 object-contain" />
              <div className="min-w-0 leading-tight">
                <p className="text-[8pt] font-extrabold tracking-wide text-rose-800">NKK Bahasa Jepang</p>
                <p className="text-[6pt] font-semibold text-slate-700">KARTU ANGGOTA</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-[2mm] py-[.8mm] text-[6pt] font-extrabold text-white ${jabatan === 'Pengurus' ? 'bg-pink-600' : 'bg-rose-700'}`}>
              {jabatan === 'Pengurus' ? 'PENGURUS' : 'ANGGOTA'}
            </span>
          </header>

          <div className="mt-[2mm] flex min-h-0 flex-1 items-center justify-between gap-[3mm]">
            <section className="min-w-0 flex-1 rounded-[2mm] bg-white/[0.94] px-[2.5mm] py-[2mm] leading-tight">
              <h2 className="member-card-name line-clamp-2 break-words font-extrabold text-slate-950" style={{ fontSize: `${nameFontSize}pt` }}>{nama}</h2>
              <p className="mt-[1mm] line-clamp-1 text-[7pt] font-semibold text-rose-800">{kelas}{jurusan ? ` · ${jurusan}` : ''}</p>
              {nis && <p className="mt-[.7mm] text-[6.5pt] font-medium text-slate-700">NIS: {nis}</p>}
              <p className="mt-[1.5mm] inline-block rounded-full bg-white/[0.94] px-[2mm] py-[.7mm] font-mono text-[6pt] font-bold tracking-wide text-rose-900">{kodeUnik}</p>
            </section>

            <div className="shrink-0 rounded-[2mm] bg-white p-[1mm] shadow-lg">
              {qrDataUrl ? <img src={qrDataUrl} alt={`QR presensi ${nama}`} width={480} height={480} className="h-[25mm] w-[25mm] object-contain" /> : <div aria-label="QR sedang disiapkan" className="h-[25mm] w-[25mm] animate-pulse bg-slate-200" />}
            </div>
          </div>
          <p className="mt-[1.5mm] text-right text-[5.5pt] font-semibold text-white drop-shadow">Ekstrakurikuler Bahasa Jepang · Scan untuk presensi</p>
        </div>
      </article>

      {showActions && qrDataUrl && (
        <div className="no-print flex items-center gap-2">
          <a href={qrDataUrl} download={`QR_${kodeUnik}_${nama.replace(/\s+/g, '_')}.png`} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-slate-800 px-3 text-xs text-slate-100 hover:bg-slate-700" title="Unduh QR Code PNG">
            <Download className="h-3.5 w-3.5" /><span>QR PNG</span>
          </a>
        </div>
      )}
    </div>
  )
}
