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
