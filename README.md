# Studio Dalang Pelo

Aplikasi desktop Electron untuk manajemen tugas, karyawan, dan proyek menggunakan Supabase.

## Persyaratan
- Node.js 18+ atau yang kompatibel dengan Electron 31
- Supabase project dengan `SUPABASE_URL` dan `SUPABASE_ANON_KEY`

## Instalasi
1. Salin file `.env.example` menjadi `.env`
2. Tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY`
3. Jalankan:

```bash
npm install
npm run dev
```

## Struktur
- `src/main` - Electron main process
- `src/preload` - preload script untuk bridge aman ke renderer
- `src/renderer` - frontend aplikasi dan views
- `supabase/migrations` - skema dan kebijakan RLS

## Catatan
- Jangan commit file `.env`
- `dist/` sudah diabaikan di `.gitignore`
- Gunakan `npm run build:win|mac|linux` untuk membuat paket
