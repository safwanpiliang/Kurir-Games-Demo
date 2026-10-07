import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from './config.js';
import { pathInfo, smoothstep } from './Terrain.js';
import { RAVINE, RIVER, PADDIES } from './Level.js';
import { addSway, makeSwayDepthMaterial } from './shaders/foliage.js';

// Pohon, rumput, dan padi memakai InstancedMesh (satu draw call per jenis).

// RNG deterministik supaya penempatan sama tiap kali dimuat
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Daerah tanpa pohon: jurang, sungai, dan lajur batu longsor
function blockedForTrees(x, z) {
  if (Math.abs(z - RAVINE.zc) < RAVINE.halfWidth + RAVINE.edge + 2) return true;
  if (Math.abs(z - RIVER.zc) < RIVER.halfWidth + RIVER.bank + 2) return true;
  if (z < -62 && z > -82 && x < 14) return true;
  return false;
}

function colorGeometry(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Bentuk pohon (origin di tanah). Mahkota diwarnai per-vertex, variasi warna lewat instanceColor.
function pineCrown() {
  const a = new THREE.ConeGeometry(1.9, 3.2, 7).translate(0, 3.6, 0);
  const b = new THREE.ConeGeometry(1.4, 2.6, 7).translate(0, 5.3, 0);
  const c = new THREE.ConeGeometry(0.9, 2.0, 7).translate(0, 6.8, 0);
  return mergeGeometries([colorGeometry(a, '#ffffff'), colorGeometry(b, '#f2fff2'), colorGeometry(c, '#e8ffe8')]);
}
function roundCrown() {
  const a = new THREE.IcosahedronGeometry(1.9, 0).translate(0, 4.0, 0);
  const b = new THREE.IcosahedronGeometry(1.3, 0).translate(0.9, 5.2, 0.4);
  const c = new THREE.IcosahedronGeometry(1.1, 0).translate(-0.8, 4.9, -0.5);
  return mergeGeometries([colorGeometry(a, '#ffffff'), colorGeometry(b, '#f4fff0'), colorGeometry(c, '#eaffea')]);
}

// Rumpun rumput: tiga bilah segitiga bersilang, ujung lebih terang.
// Tiap bilah dibuat dua kali (urutan titik dibalik) dengan normal ke atas, supaya kedua sisi
// sama terang tanpa DoubleSide (DoubleSide membalik normal sisi belakang sehingga tampak hitam).
function grassClump(height = 0.55) {
  const blades = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BufferGeometry();
    const w = 0.09;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, 0, height, 0, w, 0, 0, -w, 0, 0, 0, height, 0], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([0.55, 0.6, 0.55, 0.55, 0.6, 0.55, 1, 1, 1, 0.55, 0.6, 0.55, 0.55, 0.6, 0.55, 1, 1, 1], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.rotateY((i / 3) * Math.PI + 0.3);
    g.translate((i - 1) * 0.08, 0, ((i * 7) % 3 - 1) * 0.06);
    blades.push(g);
  }
  return mergeGeometries(blades);
}

export function buildVegetation(scene, terrain, collision) {
  const rand = mulberry32(1945);
  const half = terrain.size / 2 - 6;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const V = CONFIG.vegetation;

  // ---------- Pohon ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6e4a2b', flatShading: true, roughness: 0.9 });
  const crownMat = addSway(
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }),
    { strength: V.treeSway, speed: 1.1, heightScale: 0.12, base: 2.0 },
  );
  const crownDepth = makeSwayDepthMaterial({ strength: V.treeSway, speed: 1.1, heightScale: 0.12, base: 2.0 });
  const kinds = [
    { crown: pineCrown(), trunk: new THREE.CylinderGeometry(0.22, 0.32, 3, 6).translate(0, 1.5, 0), count: V.pineCount, palette: ['#2f7d4f', '#3a8a5a', '#2c6e57', '#4a9a5c'] },
    { crown: roundCrown(), trunk: new THREE.CylinderGeometry(0.25, 0.35, 3.4, 6).translate(0, 1.7, 0), count: V.roundCount, palette: ['#5ea84a', '#7db54a', '#4f9a6a', '#b9b24a'] },
  ];
  for (const kind of kinds) {
    const crowns = new THREE.InstancedMesh(kind.crown, crownMat, kind.count);
    const trunks = new THREE.InstancedMesh(kind.trunk, trunkMat, kind.count);
    crowns.customDepthMaterial = crownDepth;
    let placed = 0, tries = 0;
    while (placed < kind.count && tries++ < kind.count * 40) {
      const x = (rand() * 2 - 1) * half, z = (rand() * 2 - 1) * half;
      const info = pathInfo(x, z);
      const e = info.d - info.w;
      // Hanya di luar koridor; makin rapat dekat jalur supaya terasa seperti hutan
      if (e < 1.2 || blockedForTrees(x, z)) continue;
      if (rand() > 1 - smoothstep(10, 90, e) * 0.85) continue;
      const y = terrain.heightAt(x, z);
      const sc = 0.75 + rand() * 0.6;
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m.compose(p.set(x, y - 0.2, z), q, s.set(sc, sc * (0.9 + rand() * 0.3), sc));
      crowns.setMatrixAt(placed, m);
      trunks.setMatrixAt(placed, m);
      crowns.setColorAt(placed, color.set(kind.palette[Math.floor(rand() * kind.palette.length)]));
      // Pohon di tepi koridor masih bisa didekati -> beri collider batang
      if (e < 3.5) collision.addCircle({ x, z, r: 0.35 * sc });
      placed++;
    }
    crowns.count = trunks.count = placed;
    for (const im of [crowns, trunks]) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }

  // ---------- Rumput (di dalam koridor, bukan di jalan tanah/air/jurang) ----------
  const grassMat = addSway(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    { strength: V.grassSway, speed: 2.4, heightScale: 1.0, base: 0 },
  );
  const grass = new THREE.InstancedMesh(grassClump(), grassMat, V.grassCount);
  const grassPalette = ['#6fae4a', '#5c9e48', '#8dbb52', '#4f9a6a', '#c9b458'];
  let placed = 0, tries = 0;
  while (placed < V.grassCount && tries++ < V.grassCount * 30) {
    const x = (rand() * 2 - 1) * half, z = (rand() * 2 - 1) * half;
    const info = pathInfo(x, z);
    if (info.d - info.w > 1.5 || info.d < CONFIG.world.pathHalfWidth + 0.6) continue;
    if (Math.abs(z - RAVINE.zc) < RAVINE.halfWidth + RAVINE.edge) continue;
    if (Math.abs(z - RIVER.zc) < RIVER.halfWidth + RIVER.bank) continue;
    const sc = 0.7 + rand() * 0.8;
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    m.compose(p.set(x, terrain.heightAt(x, z) - 0.03, z), q, s.set(sc, sc, sc));
    grass.setMatrixAt(placed, m);
    grass.setColorAt(placed, color.set(grassPalette[Math.floor(rand() * grassPalette.length)]));
    placed++;
  }
  grass.count = placed;
  grass.receiveShadow = true;
  scene.add(grass);

  // ---------- Padi di petak sawah Lembah Padi ----------
  const riceMat = addSway(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    { strength: V.grassSway * 0.8, speed: 1.8, heightScale: 1.0, base: 0 },
  );
  const riceCells = [];
  for (const pd of PADDIES) {
    for (let gx = -pd.w / 2 + 0.4; gx < pd.w / 2 - 0.2; gx += 0.55) {
      for (let gz = -pd.d / 2 + 0.4; gz < pd.d / 2 - 0.2; gz += 0.55) riceCells.push([pd.x + gx, pd.z + gz]);
    }
  }
  const rice = new THREE.InstancedMesh(grassClump(0.7), riceMat, riceCells.length);
  riceCells.forEach(([x, z], i) => {
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    const sc = 0.85 + rand() * 0.3;
    m.compose(p.set(x + (rand() - 0.5) * 0.15, terrain.heightAt(x, z) + 0.05, z + (rand() - 0.5) * 0.15), q, s.set(sc, sc, sc));
    rice.setMatrixAt(i, m);
    rice.setColorAt(i, color.set(rand() < 0.7 ? '#b9c94e' : '#d8c25a'));
  });
  rice.receiveShadow = true;
  scene.add(rice);
}
