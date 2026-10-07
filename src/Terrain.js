import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PATH, RAVINE, RIVER } from './Level.js';

// Value noise sederhana (deterministik) untuk variasi bentuk bukit.
function hash2(ix, iz) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Hasil kira-kira di rentang [-1, 1]
export function fbm(x, z, octaves = 3) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * freq, z * freq) * 2 - 1) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Turunkan terrain ke floorY di dalam pita |z - zc| < half, dengan transisi selebar edge
function carveBand(z, y, zc, half, edge, floorY) {
  const s = smoothstep(half + edge, half, Math.abs(z - zc));
  return s > 0 ? Math.min(y, y + (floorY - y) * s) : y;
}

// Jarak titik ke polyline jalur, plus tinggi dan lebar jalur yang diinterpolasi.
export function pathInfo(x, z) {
  let best = { d: Infinity, h: 0, w: 0, seg: 0, t: 0 };
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const len2 = abx * abx + abz * abz;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    t = Math.min(1, Math.max(0, t));
    const px = a.x + abx * t, pz = a.z + abz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) {
      best = { d, h: a.h + (b.h - a.h) * t, w: a.w + (b.w - a.w) * t, seg: i, t };
    }
  }
  return best;
}

/**
 * Terrain berbasis grid. Tinggi disimpan di array sehingga heightAt() memberi nilai
 * yang persis sama dengan segitiga yang dirender (tanpa raycast ke ribuan segitiga).
 */
export class Terrain {
  constructor() {
    const W = CONFIG.world;
    this.size = W.size;
    this.segments = W.segments;
    this.cell = this.size / this.segments;
    this.half = this.size / 2;
    // Pemotong terrain: hanya menurunkan tinggi (jurang dan alur sungai)
    this.carves = [
      (x, z, y) => carveBand(z, y, RAVINE.zc, RAVINE.halfWidth, RAVINE.edge, RAVINE.floorY),
      (x, z, y) => carveBand(z, y, RIVER.zc, RIVER.halfWidth, RIVER.bank, RIVER.bedY),
    ];

    const n = this.segments + 1;
    this.heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -this.half + i * this.cell;
        const z = -this.half + j * this.cell;
        this.heights[j * n + i] = this.rawHeight(x, z);
      }
    }
    this.mesh = this.#buildMesh();
  }

  // Bentuk terrain: lantai koridor mengikuti jalur, di luar koridor naik menjadi tebing dan bukit.
  rawHeight(x, z) {
    const W = CONFIG.world;
    const p = pathInfo(x, z);
    const e = p.d - p.w; // jarak di luar koridor
    const n = fbm(x * 0.03, z * 0.03);
    let y = p.h + n * W.floorNoise;
    if (e > 0) {
      y += smoothstep(0, W.wallWidth, e) * W.wallHeight;
      y += smoothstep(W.wallWidth, W.hillWidth, e) * W.hillHeight;
      y += n * W.hillNoise * smoothstep(0, 20, e);
    }
    for (const carve of this.carves) y = carve(x, z, y, p);
    return y;
  }

  // Tinggi tepat di permukaan segitiga grid.
  heightAt(x, z) {
    const n = this.segments + 1;
    let gx = (x + this.half) / this.cell;
    let gz = (z + this.half) / this.cell;
    gx = Math.min(this.segments - 1e-4, Math.max(0, gx));
    gz = Math.min(this.segments - 1e-4, Math.max(0, gz));
    const i = Math.floor(gx), j = Math.floor(gz);
    const u = gx - i, v = gz - j;
    const hA = this.heights[j * n + i];
    const hC = this.heights[j * n + i + 1];
    const hB = this.heights[(j + 1) * n + i];
    const hD = this.heights[(j + 1) * n + i + 1];
    // Segitiga A-B-C (u+v<=1) dan C-B-D, sama dengan urutan indeks di #buildMesh
    if (u + v <= 1) return hA + (hC - hA) * u + (hB - hA) * v;
    return hD + (hB - hD) * (1 - u) + (hC - hD) * (1 - v);
  }

  // Gradien (dh/dx, dh/dz); besar gradien = tan(sudut lereng)
  gradientAt(x, z, out = { x: 0, z: 0 }) {
    const e = 0.25;
    out.x = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    out.z = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    return out;
  }

  #buildMesh() {
    const n = this.segments + 1;
    const pos = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = (j * n + i) * 3;
        pos[k] = -this.half + i * this.cell;
        pos[k + 1] = this.heights[j * n + i];
        pos[k + 2] = -this.half + j * this.cell;
      }
    }
    const index = [];
    for (let j = 0; j < this.segments; j++) {
      for (let i = 0; i < this.segments; i++) {
        const a = j * n + i, c = a + 1, b = a + n, d = b + 1;
        index.push(a, b, c, c, b, d);
      }
    }
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(index);
    // Non-indexed supaya tiap segitiga punya warna sendiri (tampilan low-poly)
    geo = geo.toNonIndexed();
    this.#paintFaces(geo);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }

  // Warna per segitiga: jalan tanah, rumput (hijau/tosca/keemasan), dan batu di lereng curam.
  #paintFaces(geo) {
    const W = CONFIG.world;
    const pos = geo.attributes.position.array;
    const colors = new Float32Array(pos.length);
    const dirt = new THREE.Color('#b98a52');
    const rock = new THREE.Color('#8a8172');
    const grassA = new THREE.Color('#6fae4a');
    const grassB = new THREE.Color('#4f9a6a'); // kehijauan-tosca
    const gold = new THREE.Color('#c9b458');   // rumput kering keemasan
    const sand = new THREE.Color('#d6c08e');   // tepian dan dasar sungai
    const gravel = new THREE.Color('#7f6d58'); // dasar jurang
    const c = new THREE.Color();
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), nrm = new THREE.Vector3();

    for (let f = 0; f < pos.length; f += 9) {
      const cx = (pos[f] + pos[f + 3] + pos[f + 6]) / 3;
      const cz = (pos[f + 2] + pos[f + 5] + pos[f + 8]) / 3;
      tmpA.set(pos[f + 3] - pos[f], pos[f + 4] - pos[f + 1], pos[f + 5] - pos[f + 2]);
      tmpB.set(pos[f + 6] - pos[f], pos[f + 7] - pos[f + 1], pos[f + 8] - pos[f + 2]);
      nrm.crossVectors(tmpA, tmpB).normalize();
      const steep = 1 - Math.abs(nrm.y); // 0 datar, 1 tegak

      const p = pathInfo(cx, cz);
      const n = fbm(cx * 0.05 + 10, cz * 0.05);
      const fh = (pos[f + 1] + pos[f + 4] + pos[f + 7]) / 3;
      const inRiver = Math.abs(cz - RIVER.zc) < RIVER.halfWidth + RIVER.bank + 1.5 && fh < RIVER.surfaceY + 0.45;
      const inRavine = Math.abs(cz - RAVINE.zc) < RAVINE.halfWidth + 0.5 && fh < RAVINE.floorY + 1.5;
      if (inRiver) {
        c.copy(sand).offsetHSL(0, 0, n * 0.05);
      } else if (inRavine) {
        c.copy(gravel).offsetHSL(0, 0, n * 0.06);
      } else if (steep > 0.45) {
        c.copy(rock).offsetHSL(0, 0, n * 0.05);
      } else if (p.d < W.pathHalfWidth + n * 0.4) {
        c.copy(dirt).offsetHSL(0, 0, n * 0.04);
      } else {
        c.copy(grassA).lerp(grassB, smoothstep(-0.3, 0.6, n));
        c.lerp(gold, smoothstep(0.2, 0.7, fbm(cx * 0.02 - 7, cz * 0.02 + 3)) * 0.6);
        c.offsetHSL(0, 0, Math.min(0.08, fh * 0.002));
        if (steep > 0.3) c.lerp(rock, (steep - 0.3) / 0.15);
      }
      for (let k = 0; k < 3; k++) {
        colors[f + k * 3] = c.r;
        colors[f + k * 3 + 1] = c.g;
        colors[f + k * 3 + 2] = c.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
}
