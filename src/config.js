// Semua angka balance (kecepatan, jarak, damage, waktu) ada di sini.
// Satuan: meter, detik, derajat (bila disebut). Ubah nilai lalu simpan; Vite memuat ulang otomatis.

export const CONFIG = {
  player: {
    walkSpeed: 5.0,          // m/s
    runSpeed: 8.5,           // m/s saat Shift ditahan
    acceleration: 14,        // seberapa cepat kecepatan mendekati target (di tanah)
    airControl: 0.3,         // pengali akselerasi saat di udara
    jumpVelocity: 7.5,       // m/s ke atas saat lompat
    gravity: 24,             // m/s^2
    maxFallSpeed: 40,        // m/s
    coyoteTime: 0.12,        // detik setelah lepas pijakan masih boleh lompat
    jumpBuffer: 0.12,        // detik tekan Space sebelum mendarat tetap dihitung
    radius: 0.4,             // radius tabrakan horizontal
    height: 1.7,
    stepHeight: 0.45,        // tinggi anak tangga yang bisa dinaiki tanpa lompat
    snapDistance: 0.35,      // jarak tempel ke tanah saat menuruni lereng
    maxSlopeDeg: 42,         // lereng lebih curam dari ini tidak bisa didaki
    slideAccel: 18,          // percepatan meluncur di lereng curam
    turnSpeed: 12,           // kecepatan badan berputar menghadap arah gerak
  },

  health: {
    playerMax: 100,
  },

  package: {
    maxHealth: 100,
    size: [0.55, 0.42, 0.42],  // lebar, tinggi, tebal (m)
    hitRadius: 0.45,         // bola tabrakan paket untuk hazard "kena langsung"
    criticalRatio: 0.3,      // di bawah ini indikator merah dan berdenyut
    glowIntensity: 0.9,      // kekuatan emissive pita indikator
  },

  // Mendarat dari ketinggian: damage paket = (kecepatanJatuh - safeSpeed) * perSpeed
  // Lompat biasa mendarat ~7.5 m/s; safeSpeed 10 ≈ jatuh bebas 2 m.
  fallDamage: {
    safeSpeed: 10,
    perSpeed: 2.5,
    max: 60,
  },

  hazards: {
    fallingTree: {
      triggerRadius: 5,      // jarak kurir ke titik trigger
      warnTime: 0.6,         // pohon bergoyang dulu (s)
      fallTime: 0.9,         // durasi tumbang (s)
      length: 10,            // panjang batang (m)
      trunkRadius: 0.4,
      hitMargin: 0.5,        // toleransi area tertimpa
      playerDamage: 20,
      packageDamage: 25,
    },
    fragileBridge: {
      plankLength: 1.5,      // panjang tiap papan sepanjang jembatan
      width: 2.4,
      fallDelay: 1.0,        // detik setelah diinjak sebelum papan jatuh
      respawnTime: 6,        // detik sampai papan kembali
      // Benturan paket saat jatuh ke jurang memakai fallDamage di atas
    },
    river: {
      packageDamagePerSecond: 5,
      speedMultiplier: 0.75, // kurir melambat di air
    },
    fallingRocks: {
      count: 5,
      spawnInterval: 0.45,   // jeda antar batu (s)
      speed: 9,              // m/s
      radiusMin: 0.7,
      radiusMax: 1.2,       // batu besar setinggi dada bisa mengenai paket
      cooldown: 10,          // detik sebelum trigger bisa aktif lagi
      playerDamage: 20,
      packageDamage: 25,     // hanya bila batu mengenai paket langsung
      knockback: 6,
    },
  },

  camera: {
    fov: 60,
    distance: 6.0,           // jarak kamera ke kurir
    minDistance: 1.5,        // jarak minimum saat terhalang tebing
    targetHeight: 1.6,       // titik yang dilihat kamera, di atas kaki kurir
    initialPitchDeg: -15,
    minPitchDeg: -65,
    maxPitchDeg: 25,
    sensitivity: 0.0022,     // rad per piksel (pointer lock)
    dragSensitivity: 0.005,  // rad per piksel (mode drag)
    followSmoothing: 10,     // makin besar makin cepat mengikuti
    groundClearance: 0.6,    // jarak minimum kamera di atas terrain
  },

  world: {
    size: 420,               // lebar dan panjang terrain (m)
    segments: 168,           // jumlah sel grid per sisi
    boundsMargin: 12,        // batas gerak dari tepi peta
    floorNoise: 0.35,        // gelombang kecil di jalur/desa
    wallWidth: 10,           // lebar transisi tebing pinggir jalur
    wallHeight: 12,          // tinggi tebing pinggir jalur
    hillWidth: 70,           // jarak hingga bukit mencapai puncak
    hillHeight: 28,
    hillNoise: 4,
    pathHalfWidth: 1.6,      // lebar jalan tanah (setengah)
  },

  render: {
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    shadowRange: 45,         // radius area bayangan di sekitar kurir
  },

  sim: {
    maxDelta: 0.1,           // dt maksimum per frame (cegah lompatan saat tab tidak aktif)
    maxSubstep: 1 / 60,      // langkah fisika maksimum
  },
};
