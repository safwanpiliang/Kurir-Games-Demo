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
| `interact`, `puzzles` | jarak tombol E, durasi animasi gerbang |
| `camera`, `world` | kamera, bentuk terrain |
| `render` | pixel ratio, bayangan, fog, bloom, color grading |
| `vegetation` | jumlah pohon/rumput dan kekuatan goyangan |

Posisi desa, jalur, dan hazard (data level) ada di `src/Level.js`.

## Alur permainan

| Desa | Puzzle (tombol E) | Lanjut ke |
|---|---|---|
| 1. Lembah Padi | Tarik **tuas** di dekat rumah warga untuk membuka gerbang desa | Jalur hutan (kayu tumbang) dan jembatan rapuh |
| 2. Tepi Sungai | Ambil **kunci** di meja salah satu rumah, buka gerbang menuju sungai | Sungai dan lereng batu longsor |
| 3. Kaki Bukit | Cari tiga papan angka **I, II, III**, masukkan **kode** di gembok pagar | Serahkan paket ke Bu Ratna = menang |

Tiap desa adalah checkpoint. Saat tiba, game menyimpan posisi, health paket, nomor desa,
status puzzle, dan waktu tempuh ke `localStorage` (`kurirNusantara.save.v1`).
Menu utama menampilkan **Lanjutkan** bila ada save; **Mulai** menghapus save dan memulai dari awal.
Kode gembok ada di `PUZZLES.code` pada `src/Level.js`.

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
- Selain isi minimal GDD (posisi, health paket, nomor desa), save juga menyimpan status puzzle (langsung saat diselesaikan) dan waktu tempuh, supaya respawn tidak memaksa mengulang puzzle.
- Posisi yang disimpan adalah titik spawn checkpoint desa, bukan posisi persis kurir.
- Save dihapus setelah menang (tidak ada lagi yang dilanjutkan).
- Kode gembok tetap (bukan acak per permainan) supaya mudah diuji.

## Visual (Fase 4)

- Flat shading low-poly dengan palet hijau, tosca, dan keemasan.
- Matahari senja dari sudut rendah dengan shadow map, HemisphereLight, kubah langit gradasi, dan `Fog`.
- `EffectComposer`: bloom (`UnrealBloomPass`), color grading (saturasi, kontras, hangat, vignette), lalu `OutputPass`.
  Bloom bisa dimatikan dari menu jeda (pilihan disimpan).
- Shader air (`ShaderMaterial`, `src/shaders/water.js`): gradasi dangkal–dalam, gelombang, garis arus, busa di tepi dan di sekitar batu pijakan.
- Goyangan daun/rumput/padi lewat vertex shader yang disuntikkan ke `MeshStandardMaterial` (`src/shaders/foliage.js`), termasuk bayangannya.
- Pohon, rumput, dan padi memakai `InstancedMesh`.
- Semua aset dari geometri bawaan Three.js. Model glTF CC0 (Kenney/Quaternius) belum dipakai; taruh di `public/assets/` bila ingin diganti.

## Performa

Diukur di browser pane pengembangan: ±13 ms GPU per frame pada kanvas 3,4 MP (bloom ±1 ms, vegetasi ±2 ms),
logika game ±0,04 ms. Bila FPS rendah di laptop:
1. Matikan bloom di menu jeda.
2. Turunkan `render.maxPixelRatio` ke `1`.
3. Kurangi `vegetation.grassCount` / `pineCount`, atau `render.shadowMapSize` ke `1024`.

## Deploy statis

`npm run build` menghasilkan `dist/` dengan path relatif (`base: './'` di `vite.config.js`), jadi bisa langsung diunggah.

- **Netlify**: build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: unggah isi `dist/` ke branch `gh-pages` (mis. `npx gh-pages -d dist`) atau pakai GitHub Actions resmi "Deploy static content to Pages" dengan path `dist`.

## Struktur kode

```
src/
  main.js          renderer, game loop, state (menu/main/jeda/kalah/menang), progres
  config.js        semua angka balance
  World.js         terrain, langit, cahaya, fog, air, vegetasi
  Terrain.js       heightmap koridor jalur, jurang, sungai
  Vegetation.js    pohon, rumput, padi (InstancedMesh)
  Level.js         data tata letak, teks tujuan, penyusun desa/puzzle/checkpoint
  Player.js        controller kinematik + model kurir
  ChaseCamera.js   kamera orang ketiga
  Input.js         keyboard, pointer lock, mode drag
  Collision.js     collider lingkaran/kotak + raycast pijakan
  Health.js        takeDamage / heal / onDeath (kurir & paket)
  Package.js       paket + indikator emissive
  Interactable.js  kelas dasar objek tombol E
  Checkpoint.js    trigger desa
  Save.js          localStorage
  Hud.js           bar health, tujuan, petunjuk E, menu, gembok kode
  PostFX.js        bloom + color grading
  props.js         rumah, pagar, papan, warga, lampion, sawah
  hazards/         Hazard (applyHazardDamage), FallingTree, FragileBridge, RiverZone, FallingRocks
  puzzles/         Gate, Lever, KeyPickup, LockedGate, CodeLock, Recipient
  shaders/         water.js, foliage.js
```

## Status

- [x] Fase 1 – Dasar: Vite, game loop, terrain low-poly, kurir (WASD, lompat, lari), kamera orang ketiga, pointer lock + drag
- [x] Fase 2 – Inti mekanik: Health (kurir & paket), indikator emissive paket, 4 hazard + fall damage, HUD, menang/kalah
- [x] Fase 3 – Level dan puzzle: 3 desa, checkpoint + save, tuas/kunci/kode lewat kelas Interactable, serah-terima paket
- [x] Fase 4 – Polesan visual: langit + fog + cahaya senja, bloom (opsional) + color grading, shader air & goyangan daun, InstancedMesh untuk vegetasi
