import { Home, Send, Sparkles, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { classOptions, majorOptions } from "../constants/registerOptions";
import { registerPendingMember } from "../services/registrationService";
import type { RegisterFormData } from "../types/register";

const initialFormData: RegisterFormData = {
  nama: "",
  kelas: "X",
  jurusan: "PSPT 1",
  nis: "",
  jenisKelamin: "P",
  website: "",
};


export function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateField = (fieldName: keyof RegisterFormData, value: string) => {
    setFormData((currentData) => ({
      ...currentData,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await registerPendingMember(formData);
      setStatusMessage("Pendaftaran terkirim. Data kamu masuk ke antrian sekretaris untuk diproses.");
      setFormData(initialFormData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Pendaftaran belum bisa diproses.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-nkk-background px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(239,35,60,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(244,114,182,0.16),transparent_26%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <section>
          <Link to="/" aria-label="Kembali ke Beranda" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-zinc-300 transition hover:border-nkk-red hover:text-white"><Home size={19} /></Link>
          <div className="mt-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-nkk-red/30 bg-nkk-red/10 text-nkk-red neon-ring">
            <UserPlus size={28} />
          </div>
          <h1 className="mt-6 text-5xl font-black leading-tight sm:text-6xl">Gabung NIHONGO KURABU KATSUDO</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-zinc-300">
            Isi data pendaftaran. Sekretaris akan meninjau dan memprosesnya melalui dashboard NKKSmart.
          </p>
          <div className="mt-8 grid gap-3 text-sm font-bold text-zinc-300">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-nkk-pink" />
              Data dikirim dengan aman ke antrean pendaftaran NKKSmart.
            </div>
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-nkk-red" />
              Persetujuan akan membuat data anggota dan kartu QR di NKKSmart.
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-5 sm:p-8">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden" tabIndex={-1}>
              Website
              <input name="website" value={formData.website} onChange={(event) => updateField("website", event.target.value)} tabIndex={-1} autoComplete="off" />
            </label>
            <div>
              <label htmlFor="nama" className="text-sm font-black text-white">
                Nama
              </label>
              <input
                id="nama"
                value={formData.nama}
                onChange={(event) => updateField("nama", event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-nkk-red focus:ring-4 focus:ring-nkk-red/10"
                placeholder="Nama lengkap"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="kelas" className="text-sm font-black text-white">
                  Kelas
                </label>
                <select
                  id="kelas"
                  value={formData.kelas}
                  onChange={(event) => updateField("kelas", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-4 text-white outline-none transition focus:border-nkk-red focus:ring-4 focus:ring-nkk-red/10"
                >
                  {classOptions.map((classOption) => (
                    <option key={classOption} value={classOption}>
                      {classOption}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="jurusan" className="text-sm font-black text-white">
                  Jurusan
                </label>
                <select
                  id="jurusan"
                  value={formData.jurusan}
                  onChange={(event) => updateField("jurusan", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-4 text-white outline-none transition focus:border-nkk-red focus:ring-4 focus:ring-nkk-red/10"
                >
                  {majorOptions.map((majorOption) => (
                    <option key={majorOption} value={majorOption}>
                      {majorOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="nis" className="text-sm font-black text-white">
                NIS
              </label>
              <input
                id="nis"
                value={formData.nis}
                onChange={(event) => updateField("nis", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-nkk-red focus:ring-4 focus:ring-nkk-red/10"
                placeholder="Opsional untuk kelas 10"
              />
            </div>

            <div>
              <label htmlFor="jenisKelamin" className="text-sm font-black text-white">
                Jenis Kelamin
              </label>
              <select
                id="jenisKelamin"
                value={formData.jenisKelamin}
                onChange={(event) => updateField("jenisKelamin", event.target.value as "P" | "L")}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950/35 px-4 py-4 text-white outline-none transition focus:border-nkk-red focus:ring-4 focus:ring-nkk-red/10"
              >
                <option value="P">P</option>
                <option value="L">L</option>
              </select>
            </div>


            {statusMessage && (
              <p className="rounded-2xl border border-nkk-red/30 bg-nkk-red/10 px-4 py-3 text-sm font-bold text-nkk-red">
                {statusMessage}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-2xl border border-nkk-pink/30 bg-nkk-pink/10 px-4 py-3 text-sm font-bold text-nkk-pink">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-nkk-red px-6 py-4 text-sm font-black text-zinc-950 shadow-neon transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={18} />
              {isSubmitting ? "Mengirim..." : "Kirim Pendaftaran"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
