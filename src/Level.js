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
