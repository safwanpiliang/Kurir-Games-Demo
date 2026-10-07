import * as THREE from 'three';

// Data tata letak level: desa, jalur utama, dan titik awal.
// Koordinat dunia: kurir berangkat dari selatan (+z) menuju utara (-z).

export const VILLAGES = [
  { id: 0, name: 'Lembah Padi', x: 0, z: 150, h: 0 },
  { id: 1, name: 'Tepi Sungai', x: 18, z: 10, h: 2 },
  { id: 2, name: 'Kaki Bukit', x: 0, z: -125, h: 7 },
];

// Polyline jalur. h = tinggi lantai jalur, w = setengah lebar koridor yang bisa dilalui.
// Di luar koridor terrain naik menjadi tebing dan bukit.
export const PATH = [
  { x: 0, z: 150, h: 0, w: 28 },     // Lembah Padi
  { x: 0, z: 122, h: 0.5, w: 10 },   // gerbang keluar desa 1
  { x: 6, z: 100, h: 1.5, w: 4.5 },  // jalur hutan sempit
  { x: 10, z: 82, h: 2, w: 4.5 },
  { x: 12, z: 64, h: 2.5, w: 7 },    // menuju jurang
  { x: 12, z: 34, h: 2.5, w: 8 },
  { x: 18, z: 10, h: 2, w: 26 },     // Tepi Sungai
  { x: 18, z: -14, h: 1.5, w: 10 },  // gerbang menuju sungai
  { x: 14, z: -48, h: 2, w: 9 },
  { x: 6, z: -70, h: 4, w: 7 },      // lereng batu longsor
  { x: 0, z: -92, h: 6, w: 8 },
  { x: 0, z: -125, h: 7, w: 26 },    // Kaki Bukit
];

// yaw 0 = menghadap -z (utara)
export const SPAWN = { x: 0, z: 140, yaw: 0 };

// Jurang yang diseberangi jembatan rapuh (memotong terrain sepanjang sumbu x)
export const RAVINE = { zc: 49, halfWidth: 7, edge: 1.2, floorY: -5.5 };

// Sungai dangkal yang mengalir sepanjang sumbu x
export const RIVER = { zc: -30, halfWidth: 6, bank: 3, bedY: 0.4, surfaceY: 1.3 };

// Penempatan hazard (angka balance ada di config.js)
export const HAZARD_LAYOUT = {
  // Trigger diatur supaya kurir yang berjalan tertimpa, yang berlari atau berhenti selamat
  fallingTree: { trigger: { x: 8, z: 93.5 }, pivot: { x: 13.5, z: 91 } },
  fragileBridge: {
    x: 12, zStart: 58, zEnd: 40, y: 2.6,
    missing: [6], // papan yang sudah lapuk sejak awal (harus dilompati)
    // Ramp kayu untuk naik kembali dari dasar jurang ke tepi selatan
    ramp: { bottom: { x: 34, z: 53.5 }, top: { x: 18, z: 53.5 } },
  },
  river: {
    // Batu pijakan di atas air (alternatif menyeberang tanpa basah)
    stones: [
      { x: 17.0, z: -23.5 }, { x: 16.0, z: -26.0 }, { x: 17.2, z: -28.5 },
      { x: 15.8, z: -31.0 }, { x: 16.6, z: -33.6 }, { x: 15.4, z: -36.2 },
    ],
  },
  fallingRocks: {
    trigger: { x: 9, z: -60, r: 6 },
    laneZ: [-66, -78],       // rentang z tempat batu menyeberang jalur
    fromX: -14, toX: 13,     // dari lereng barat ke tepi timur jalur
  },
};

// SEMENTARA (Fase 2): masuk area ini = menang. Diganti serah-terima ke penerima (E) di Fase 3.
export const TEMP_GOAL = { x: 0, z: -125, r: 6 };

// ---------------------------------------------------------------------------
// SEMENTARA (Fase 1): peti dan ramp di Lembah Padi untuk menguji lompat,
// naik anak tangga, dan raycast pijakan. Diganti rumah dan properti desa di Fase 3.
export function buildTestProps(scene, collision) {
  const mat = new THREE.MeshStandardMaterial({ color: '#a47148', flatShading: true, roughness: 0.9 });
  const crates = [
    { x: 4, z: 134, w: 1.4, h: 0.4, d: 1.4 },  // bisa dinaiki tanpa lompat
    { x: 7, z: 134, w: 1.6, h: 1.1, d: 1.6 },  // perlu lompat
    { x: 10, z: 134, w: 1.6, h: 2.0, d: 1.6 }, // terlalu tinggi
  ];
  for (const c of crates) {
    const base = collision.terrain.heightAt(c.x, c.z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), mat);
    m.position.set(c.x, base + c.h / 2, c.z);
    m.castShadow = m.receiveShadow = true;
    m.updateMatrixWorld();
    scene.add(m);
    collision.addWalkable(m);
    collision.addBox({ x: c.x, z: c.z, hx: c.w / 2, hz: c.d / 2, yMin: base, yMax: base + c.h });
  }
  // Ramp miring ke atas peti tinggi
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 5), mat);
  const base = collision.terrain.heightAt(10, 137.8);
  ramp.position.set(10, base + 1.0, 137.3);
  ramp.rotation.x = Math.atan2(2.0, 4.6); // ujung -z (dekat peti) lebih tinggi
  ramp.castShadow = ramp.receiveShadow = true;
  ramp.updateMatrixWorld();
  scene.add(ramp);
  collision.addWalkable(ramp);
}
