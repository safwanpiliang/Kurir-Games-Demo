# Kurir Nusantara (Prototipe Three.js)

Prototipe web untuk memvalidasi mekanik inti Kurir Nusantara sebelum dibuat ulang di Unreal Engine 5.
Sumber kebenaran desain: `GDD Kurir Nusantara Versi Three.js (Prototipe Web).pdf`.

## Menjalankan

```bash
npm install
npm run dev        # buka http://localhost:5173  (tambahkan ?debug untuk penghitung FPS dan window.__game)
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

Semua angka balance ada di `src/config.js`; simpan file dan Vite memuat ulang game otomatis.

| Bagian | Isi |
|---|---|
| `player` | kecepatan jalan/lari, lompat, gravitasi, batas lereng |
| `health`, `package` | health awal kurir dan paket, ambang kritis indikator |
| `fallDamage` | damage paket saat mendarat: `(kecepatanJatuh - safeSpeed) * perSpeed` |
| `hazards.*` | damage, waktu, dan jarak tiap hazard |
| `camera`, `render`, `world` | kamera, bayangan, bentuk terrain |

Posisi desa, jalur, dan hazard (data level) ada di `src/Level.js`.

## Aturan damage (dari GDD)

| Hazard | Kurir | Paket |
|---|---|---|
| Batu longsor | `playerDamage` bila tertabrak | `packageDamage` hanya bila batu mengenai paket langsung |
| Kayu tumbang | `playerDamage` bila tertimpa | `packageDamage` bila tertimpa |
| Jembatan rapuh | jatuh ke jurang (tanpa damage) | benturan = fall damage saat mendarat |
| Sungai | melambat | `packageDamagePerSecond` selama kaki di bawah air |
| Mendarat dari tinggi | – | fall damage |

Semua damage hazard lewat satu fungsi `applyHazardDamage()` di `src/hazards/Hazard.js`.

## Asumsi desain

- Paket digendong di punggung supaya selalu terlihat dari kamera belakang.
- Jembatan rapuh: kurir tidak kena damage saat jatuh; benturan paket dihitung dari kecepatan jatuh. Papan kembali setelah `respawnTime`, dan ramp kayu di dasar jurang membawa kurir naik ke tepi selatan.
- Kayu tumbang tetap melintang di jalur setelah jatuh dan harus dilompati. Trigger disetel supaya kurir yang berjalan tertimpa, sedangkan yang berlari atau berhenti selamat.
- Sungai memperlambat kurir (`speedMultiplier`). Batu pijakan memberi jalan menyeberang tanpa basah.
- Kalah: kembali ke checkpoint terakhir dengan health kurir penuh dan health paket sesuai yang tersimpan. Waktu tempuh termasuk percobaan ulang.
- Fall damage hanya mengenai paket (GDD tidak menyebut damage jatuh ke kurir).

## Status

- [x] Fase 1 – Dasar: Vite, game loop, terrain low-poly, kurir (WASD, lompat, lari), kamera orang ketiga, pointer lock + drag
- [x] Fase 2 – Inti mekanik: Health (kurir & paket), indikator emissive paket, 4 hazard + fall damage, HUD, menang/kalah
- [ ] Fase 3 – Level dan puzzle
- [ ] Fase 4 – Polesan visual
