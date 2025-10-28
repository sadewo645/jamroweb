# JAMRO Palm Monitoring Platform

Prototype monorepo untuk command center monitoring perkebunan dan pabrik kelapa sawit.

## Struktur Proyek

```
apps/
  api/      -> HTTP API simulator (Node.js native server)
  web/      -> Dashboard front-end (static HTML + Tailwind via CDN)
packages/  -> (kosong, siap menampung lib bersama)
```

## Menjalankan Secara Lokal

1. **API Simulator**
   ```bash
   npm run dev:api
   ```
   Server akan jalan di `http://localhost:4000` dengan endpoint:
   - `GET /afdelings`
   - `GET /harvest/aggregate?period=day|month|year`
   - `GET /pabrik/stations`
   - `GET /pabrik/aggregate?period=...`
   - `GET /panduan`
   - `GET /norma-hk`
   - `GET /cost/summary?period=...`
   - `GET /health`

2. **Dashboard Web**
   Buka file `apps/web/index.html` menggunakan ekstensi Live Server (VSCode) atau jalankan server statis favorit Anda:
   ```bash
   (cd apps/web && python -m http.server 4173)
   ```
   Dashboard akan otomatis memanggil API simulator. Jika API tidak aktif, dashboard memakai data fallback di sisi klien.

## Fitur yang Tercakup

- Ringkasan KPI TBS, CPO, RBDPO, Olein, Stearin, PKO.
- Grid kartu Afdeling dengan status agroklimat, produksi, dan blok per afdeling.
- Monitoring pabrik per stasiun (Timbang, Sterilizer, Press, dsb) lengkap indikator throughput, rendemen, suhu, tekanan.
- Panduan Budidaya, ringkasan Norma HK, dan Cost Produksi.
- Simulasi pembaruan data tiap 30 detik (1 hari di dunia nyata).

## Variabel Lingkungan

- `SIM_RATIO_SECONDS` — default `30`, menentukan percepatan waktu (1 hari = 30 detik).
- `PORT` — default `4000`, port server API simulator.

## Pengembangan Selanjutnya

- Migrasi API simulator ke NestJS + Prisma + PostgreSQL.
- Integrasi websocket (Socket.IO) untuk push data real-time ke dashboard.
- Tambah autentikasi JWT dan manajemen role (Pekerja, Mandor, Direktur, Pengembang kode 123456).
- Implementasi editor CMS untuk Panduan Budidaya serta riwayat perubahan Norma HK.
- Export laporan CSV untuk harvest, cost, dan perbandingan norma.
