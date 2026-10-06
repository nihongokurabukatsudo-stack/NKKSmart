export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
          username: string
          full_name: string
          last_login: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          last_login?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          last_login?: string | null
          created_at?: string
        }
      }
      anggota: {
        Row: {
          id: number
          kode_qr: string | null
          nama_lengkap: string
          kelas: string
          jurusan: string
          nis: string | null
          jenis_kelamin: 'L' | 'P' | null
          jabatan: 'Anggota' | 'Pengurus'
          status: 'Aktif' | 'Nonaktif'
          is_deleted: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          kode_qr?: string | null
          nama_lengkap: string
          kelas: string
          jurusan?: string
          nis?: string | null
          jenis_kelamin?: 'L' | 'P' | null
          jabatan?: 'Anggota' | 'Pengurus'
          status?: 'Aktif' | 'Nonaktif'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          kode_qr?: string | null
          nama_lengkap?: string
          kelas?: string
          jurusan?: string
          nis?: string | null
          jenis_kelamin?: 'L' | 'P' | null
          jabatan?: 'Anggota' | 'Pengurus'
          status?: 'Aktif' | 'Nonaktif'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      barcode: {
        Row: {
          id: number
          kode_unik: string
          qr_value: string
          anggota_id: number
          created_at: string
        }
        Insert: {
          id?: number
          kode_unik: string
          qr_value: string
          anggota_id: number
          created_at?: string
        }
        Update: {
          id?: number
          kode_unik?: string
          qr_value?: string
          anggota_id?: number
          created_at?: string
        }
      }
      pertemuan: {
        Row: {
          id: number
          nama_pertemuan: string
          pertemuan_ke: number
          tanggal: string
          jam_mulai_scan: string
          jam_akhir_scan: string
          keterangan: string | null
          manual_active: boolean
          is_libur: boolean
          created_at: string
        }
        Insert: {
          id?: number
          nama_pertemuan: string
          pertemuan_ke: number
          tanggal: string
          jam_mulai_scan: string
          jam_akhir_scan: string
          keterangan?: string | null
          manual_active?: boolean
          is_libur?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          nama_pertemuan?: string
          pertemuan_ke?: number
          tanggal?: string
          jam_mulai_scan?: string
          jam_akhir_scan?: string
          keterangan?: string | null
          manual_active?: boolean
          is_libur?: boolean
          created_at?: string
        }
      }
      absensi: {
        Row: {
          id: number
          pertemuan_id: number
          anggota_id: number
          barcode_id: number
          status: 'hadir' | 'izin' | 'sakit' | 'alpha'
          scan_time: string | null
          waktu_scan: string | null
          catatan: string | null
        }
        Insert: {
          id?: number
          pertemuan_id: number
          anggota_id: number
          barcode_id: number
          status?: 'hadir' | 'izin' | 'sakit' | 'alpha'
          scan_time?: string | null
          waktu_scan?: string | null
          catatan?: string | null
        }
        Update: {
          id?: number
          pertemuan_id?: number
          anggota_id?: number
          barcode_id?: number
          status?: 'hadir' | 'izin' | 'sakit' | 'alpha'
          scan_time?: string | null
          waktu_scan?: string | null
          catatan?: string | null
        }
      }
      geofence_settings: {
        Row: {
          id: number
          lat: number | null
          lng: number | null
          radius: number
          updated_at: string
        }
        Insert: {
          id?: number
          lat?: number | null
          lng?: number | null
          radius?: number
          updated_at?: string
        }
        Update: {
          id?: number
          lat?: number | null
          lng?: number | null
          radius?: number
          updated_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_geofence: {
        Args: Record<string, never>
        Returns: {
          ok: boolean
          configured: boolean
          lat?: number
          lng?: number
          radius?: number
          updated_at?: string
          message?: string
        }
      }
      get_scan_status: {
        Args: Record<string, never>
        Returns: {
          active: boolean
          status: 'active' | 'libur' | 'manual' | 'inactive' | 'no_meeting'
          meeting: {
            id: number
            nama_pertemuan: string
            pertemuan_ke: number
            tanggal: string
            jam_mulai_scan: string
            jam_akhir_scan: string
            manual_active: boolean
            status: string
          } | null
          message: string
        }
      }
      submit_scan: {
        Args: {
          kode: string
          scan_type?: 'auto' | 'anggota' | 'pengurus'
          mode?: 'camera' | 'manual'
        }
        Returns: {
          ok: boolean
          message: string
          nama?: string
          kelas?: string
          jabatan?: string
          tipe?: string
          pertemuan?: string
          waktu_scan?: string
        }
      }
    }
  }
}
