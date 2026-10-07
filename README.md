# Kurir Nusantara (Prototipe Three.js)

Prototipe web untuk memvalidasi mekanik inti Kurir Nusantara sebelum dibuat ulang di Unreal Engine 5.
Sumber kebenaran desain: `GDD Kurir Nusantara Versi Three.js (Prototipe Web).pdf`.

## Menjalankan

```bash
npm install
npm run dev        # buka http://localhost:5173  (tambahkan ?debug untuk penghitung FPS)
npm run build      # hasil statis di dist/
npm run preview    # mencoba hasil build
```

## Kontrol

| Input | Fungsi |
|---|---|
| W A S D | Bergerak relatif terhadap kamera |
| Mouse | Memutar kamera (klik layar untuk pointer lock) |
| Tahan klik kiri + geser | Memutar kamera tanpa pointer lock (cadangan / mode Drag) |
| Space | Melompat |
| Shift (tahan) | Berlari |
| E | Berinteraksi |
| Esc | Jeda / lanjutkan |

## Menyetel nilai

Semua angka balance (kecepatan, lompat, kamera, ukuran terrain, dst.) ada di `src/config.js`.
Simpan file dan Vite memuat ulang game otomatis.

## Status

- [x] Fase 1 – Dasar: Vite, game loop, terrain low-poly, kurir (WASD, lompat, lari), kamera orang ketiga, pointer lock + drag
- [ ] Fase 2 – Inti mekanik
- [ ] Fase 3 – Level dan puzzle
- [ ] Fase 4 – Polesan visual
