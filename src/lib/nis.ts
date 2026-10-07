/** NIS stays untouched in storage; this helper only controls what users see. */
export const formatNis = (nis: string | null | undefined): string => {
  const value = String(nis ?? '').trim()
  return !value || value === '-' || value.toLowerCase() === 'null' ? '' : value
}

export const memberImportKey = (name: string, kelas: string, jurusan: string) =>
  [name, kelas, jurusan].map((value) => value.trim().toLocaleLowerCase('id-ID')).join('|')
