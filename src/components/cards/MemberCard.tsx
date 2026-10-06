import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer } from 'lucide-react'

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
  nama,
  kelas,
  jurusan,
  nis,
  kodeUnik,
  qrValue,
  jabatan,
  showActions = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    const rawVal = qrValue || `NKKSMART|MEMBER|${kodeUnik}`
    QRCode.toDataURL(rawVal, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url)
      })
      .catch((err) => {
        console.error('Error generating QR code:', err)
      })
  }, [qrValue, kodeUnik])

  const handlePrintSingle = () => {
    window.print()
  }

  return (
    <div className="flex flex-col items-center gap-2 member-card-wrapper">
      {/* Kartu Fisik Preview */}
      <div
        ref={cardRef}
        className="w-[330px] h-[200px] rounded-2xl relative overflow-hidden border border-slate-700/80 shadow-xl flex flex-col justify-between p-4 text-white select-none bg-slate-900"
        style={{
          backgroundImage: "url('/img/kartu_bgs.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/img/nkk.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow" />
            <div>
              <h4 className="text-xs font-bold tracking-wider text-pink-300 drop-shadow">NKK SMART</h4>
              <p className="text-[9px] text-slate-200 drop-shadow">KARTU ABSENSI RESMI</p>
            </div>
          </div>
          <span
            className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wider shadow ${
              jabatan === 'Pengurus'
                ? 'bg-pink-500/80 text-white'
                : 'bg-rose-600/80 text-white'
            }`}
          >
            {jabatan}
          </span>
        </div>

        {/* Center Content: Info & QR Code */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          {/* Member Details */}
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-sm font-bold text-white drop-shadow truncate leading-tight">
              {nama}
            </p>
            <p className="text-xs text-pink-200 font-medium drop-shadow mt-0.5">
              {kelas} - {jurusan}
            </p>
            {nis && (
              <p className="text-[10px] text-slate-300 drop-shadow mt-0.5">
                NIS: <span className="font-mono font-semibold">{nis}</span>
              </p>
            )}
            <div className="mt-2 inline-block px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono font-semibold text-pink-300 tracking-wider">
              {kodeUnik}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="w-[84px] h-[84px] bg-white p-1 rounded-xl shadow-md shrink-0 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
            ) : (
              <canvas ref={canvasRef} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="relative z-10 flex items-center justify-between text-[9px] text-slate-300/80 pt-1 border-t border-white/20">
          <span>Ekstrakurikuler Bahasa Jepang</span>
          <span>Scan untuk presensi</span>
        </div>
      </div>

      {/* Action Buttons (Download / Print) */}
      {showActions && (
        <div className="flex items-center gap-2 no-print mt-1">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`QR_${kodeUnik}_${nama.replace(/\s+/g, '_')}.png`}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition"
              title="Unduh QR Code PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>QR PNG</span>
            </a>
          )}
          <button
            onClick={handlePrintSingle}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-700 hover:bg-pink-600 text-white rounded-lg text-xs transition"
            title="Cetak Kartu"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      )}
    </div>
  )
}
