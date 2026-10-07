import type { RegisterFormData } from "../types/register";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export async function registerPendingMember(formData: RegisterFormData) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.");
  }

  const { data, error } = await supabase.rpc("submit_pendaftaran", {
    p_nama: formData.nama,
    p_kelas: formData.kelas,
    p_jurusan: formData.jurusan,
    p_nis: formData.nis || null,
    p_jk: formData.jenisKelamin,
    p_kontak: null,
    p_alasan: null,
    p_website: formData.website,
  });

  if (error || !data?.ok) {
    throw new Error(data?.message || "Pendaftaran belum bisa diproses.");
  }
}
