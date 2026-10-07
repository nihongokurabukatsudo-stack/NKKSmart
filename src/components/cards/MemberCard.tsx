import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { formatNis } from '../../lib/nis'

interface MemberCardProps {
  id?: number
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
  const visibleNis = formatNis(nis)

  const downloadCompleteCard = async () => {
    if (!qrDataUrl) return
    const canvas = document.createElement('canvas')
    canvas.width = 1012
    canvas.height = 638
    const context = canvas.getContext('2d')
    if (!context) return

    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
    try {
      const [background, logo, qr] = await Promise.all([
        loadImage('/assets/admin/kartu_bgs.jpg'), loadImage('/assets/admin/nkk.png'), loadImage(qrDataUrl),
      ])
      const scale = Math.max(canvas.width / background.width, canvas.height / background.height)
      const width = background.width * scale
      const height = background.height * scale
      context.drawImage(background, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
      context.fillStyle = 'rgba(8, 12, 26, 0.34)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = 'rgba(255,255,255,0.96)'
      context.beginPath(); context.roundRect(30, 28, 952, 98, 24); context.fill()
      context.drawImage(logo, 52, 44, 64, 64)
      context.fillStyle = '#881337'; context.font = '800 31px Arial'; context.fillText('NKK Bahasa Jepang', 132, 78)
      context.fillStyle = '#334155'; context.font = '700 22px Arial'; context.fillText('KARTU ANGGOTA', 132, 108)
      context.fillStyle = jabatan === 'Pengurus' ? '#db2777' : '#be123c'
      context.beginPath(); context.roundRect(790, 54, 164, 46, 23); context.fill()
      context.fillStyle = '#fff'; context.font = '800 20px Arial'; context.textAlign = 'center'
      context.fillText(jabatan === 'Pengurus' ? 'PENGURUS' : 'ANGGOTA', 872, 84)
      context.textAlign = 'left'
      context.fillStyle = 'rgba(255,255,255,0.96)'
      context.beginPath(); context.roundRect(42, 156, 650, 374, 22); context.fill()
      context.fillStyle = '#0f172a'; context.font = `800 ${Math.min(48, Math.max(27, 560 / Math.max(nama.length, 1)))}px Arial`
      const words = nama.split(/\s+/); let line = ''; let lineY = 224
      for (const word of words) {
        const next = line ? `${line} ${word}` : word
        if (context.measureText(next).width > 590 && line) { context.fillText(line, 76, lineY); line = word; lineY += 56 }
        else line = next
      }
      if (line) context.fillText(line, 76, lineY)
      context.fillStyle = '#9f1239'; context.font = '700 31px Arial'
      context.fillText(`${kelas}${jurusan ? ` · ${jurusan}` : ''}`, 76, lineY + 65)
      if (visibleNis) { context.fillStyle = '#334155'; context.font = '25px Arial'; context.fillText(`NIS: ${visibleNis}`, 76, lineY + 112) }
      context.fillStyle = '#fff'; context.beginPath(); context.roundRect(76, 416, 270, 58, 17); context.fill()
      context.fillStyle = '#881337'; context.font = '800 25px monospace'; context.fillText(kodeUnik, 94, 453)
      context.fillStyle = '#fff'; context.beginPath(); context.roundRect(738, 156, 250, 374, 22); context.fill()
      context.drawImage(qr, 758, 176, 210, 210)
      context.fillStyle = '#881337'; context.textAlign = 'center'; context.font = '800 25px Arial'; context.fillText('QR PRESENSI', 863, 424)
      context.fillStyle = '#334155'; context.font = '19px Arial'; context.fillText(kodeUnik, 863, 458)
      context.textAlign = 'right'; context.fillStyle = '#fff'; context.font = '600 19px Arial'
      context.fillText('Ekstrakurikuler Bahasa Jepang · Scan untuk presensi', 970, 612)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Kartu tidak dapat dibuat.')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `Kartu_${kodeUnik}_${nama.replace(/\s+/g, '_')}.png`; anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Gagal membuat PNG kartu anggota:', error)
    }
  }

  return (
    <div className="member-card-wrapper flex flex-col items-center gap-2" data-print-ready={qrDataUrl ? 'true' : 'false'}>
      <article data-member-card-id={id} className="member-card relative h-[54mm] w-[85.6mm] shrink-0 overflow-hidden rounded-[2.5mm] bg-slate-950 text-slate-950 print-color">
        <img src="/assets/admin/kartu_bgs.jpg" alt="" aria-hidden="true" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 flex h-full flex-col p-[3mm]">
          <header className="flex min-h-[9mm] items-center justify-between gap-[1mm] rounded-[2mm] bg-white/[0.94] px-[2mm] py-[1mm]">
            <div className="flex min-w-0 items-center gap-[1.5mm]">
              <img src="/assets/admin/nkk.png" alt="Logo NKK" width={80} height={80} className="h-[7mm] w-[7mm] shrink-0 object-contain" />
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
              {visibleNis && <p className="mt-[.7mm] text-[6.5pt] font-medium text-slate-700">NIS: {visibleNis}</p>}
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
          <button type="button" onClick={() => void downloadCompleteCard()} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-pink-700 px-3 text-xs font-semibold text-white hover:bg-pink-600" title="Unduh kartu lengkap dalam PNG">
            <Download className="h-3.5 w-3.5" /><span>Kartu PNG</span>
          </button>
        </div>
      )}
    </div>
  )
}
