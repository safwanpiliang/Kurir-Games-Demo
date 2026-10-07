import * as THREE from 'three';
import { makeHouse, makeFence, makeSign, makeLantern, makePaddy } from './props.js';
import { Checkpoint } from './Checkpoint.js';
import { Gate } from './puzzles/Gate.js';
import { Lever } from './puzzles/Lever.js';
import { KeyPickup } from './puzzles/KeyPickup.js';
import { LockedGate } from './puzzles/LockedGate.js';
import { CodeLock } from './puzzles/CodeLock.js';
import { Recipient } from './puzzles/Recipient.js';

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

// ---------------------------------------------------------------------------
// Checkpoint desa: masuk lingkaran (x, z, r) menyimpan progres; respawn di `spawn`.
export const CHECKPOINTS = [
  { village: 0, name: 'Lembah Padi', x: 0, z: 145, r: 14, spawn: { x: 0, z: 140, yaw: 0 }, flag: { x: -4, z: 138 } },
  { village: 1, name: 'Tepi Sungai', x: 16, z: 18, r: 10, spawn: { x: 16, z: 16, yaw: 0 }, flag: { x: 11, z: 22 } },
  { village: 2, name: 'Kaki Bukit', x: 0, z: -112, r: 9, spawn: { x: 0, z: -110, yaw: 0 }, flag: { x: 5, z: -106 } },
];

// Puzzle tiap desa
export const PUZZLES = {
  lever: { x: -9.5, z: 141 },
  gate1: { x: 0, z: 124, halfSpan: 14, door: 4 },
  key: { x: 32, z: 19.2 },
  gate2: { x: 18, z: -14, halfSpan: 13, door: 4 },
  courtyard: { x: 0, zFront: -136, zBack: -151, halfW: 9, door: 3.6 },
  code: [4, 7, 2],
  // Tiap papan menunjukkan satu digit beserta urutannya (I, II, III)
  codeSigns: [{ x: -12, z: -114 }, { x: 13, z: -130 }, { x: -15, z: -133 }],
  recipient: { x: 0, z: -141.5, name: 'Bu Ratna' },
};

const HALF_PI = Math.PI / 2;
const HOUSES = [
  // Lembah Padi
  { x: -14, z: 146, yaw: HALF_PI }, { x: 14, z: 152, yaw: -HALF_PI, roof: '#b5562f' },
  { x: -11, z: 164, yaw: Math.PI, wall: '#f0dfb8' }, { x: 11, z: 166, yaw: Math.PI },
  // Tepi Sungai
  { x: 4, z: 12, yaw: HALF_PI, roof: '#2a7f74' }, { x: 32, z: 4, yaw: -HALF_PI },
  { x: 5, z: -2, yaw: HALF_PI, wall: '#f0dfb8' }, { x: 32, z: 24, yaw: Math.PI, roof: '#2a7f74' },
  // Kaki Bukit
  { x: -17, z: -120, yaw: HALF_PI }, { x: 17, z: -122, yaw: -HALF_PI, roof: '#2a7f74' },
  { x: 15, z: -106, yaw: -HALF_PI, wall: '#f0dfb8' },
  { x: 0, z: -146, yaw: 0, w: 7, d: 5, roof: '#c9a035' }, // rumah penerima
];

export const PADDIES = [
  { x: 11, z: 131, w: 8, d: 5 }, { x: 11, z: 137, w: 8, d: 5, color: '#b5c85a' },
  { x: -12, z: 130, w: 7, d: 5 }, { x: -20, z: 136, w: 6, d: 7, color: '#b5c85a' },
  { x: 0, z: 172, w: 12, d: 6 },
];

const LANTERNS = [
  { x: 3.2, z: 126.5 }, { x: -3.2, z: 126.5 }, { x: 4, z: 150 },
  { x: 15, z: -11.5 }, { x: 21, z: -11.5 }, { x: 22, z: 12 },
  { x: 2.6, z: -134 }, { x: -2.6, z: -134 }, { x: -4, z: -116 },
];

const WELCOME_SIGNS = [
  { x: 6, z: 127, lines: ['LEMBAH PADI', 'Desa 1'] },
  { x: 25, z: -11, lines: ['TEPI SUNGAI', 'Desa 2'] },
  { x: 6, z: -100, lines: ['KAKI BUKIT', 'Desa 3'] },
];

/** Teks tujuan sesuai progres (ditampilkan di HUD). */
export function objectiveText(progress) {
  const f = progress.flags;
  if (!f.leverPulled) return 'Gerbang Lembah Padi tertutup. Cari tuas di desa untuk membukanya.';
  if (progress.village < 1) return 'Bawa paket ke Tepi Sungai. Hati-hati di jalur hutan dan jembatan tua.';
  if (!f.gate2Open) {
    return f.keyTaken
      ? 'Buka gerbang menuju sungai dengan kunci.'
      : 'Gerbang menuju sungai terkunci. Cari kuncinya di Tepi Sungai.';
  }
  if (progress.village < 2) return 'Seberangi sungai dan naik ke Kaki Bukit. Waspadai lereng berbatu.';
  if (!f.codeOpen) return 'Pagar rumah Bu Ratna digembok kode. Cari tiga angka (I, II, III) di desa.';
  return 'Serahkan paket kepada Bu Ratna.';
}

/**
 * Bangun properti desa, checkpoint, dan puzzle.
 * @returns {{ interactables, checkpoints, gates, applyProgress(flags), update(dt) }}
 */
export function buildLevel(ctx) {
  const { scene, collision, terrain } = ctx;
  const ground = (x, z) => terrain.heightAt(x, z);

  for (const h of HOUSES) {
    const house = makeHouse({ w: h.w ?? 6, d: h.d ?? 5, wall: h.wall, roof: h.roof, yaw: h.yaw });
    house.group.position.set(h.x, ground(h.x, h.z), h.z);
    scene.add(house.group);
    collision.addBox({ x: h.x, z: h.z, hx: house.hx, hz: house.hz, rot: h.yaw, yMax: ground(h.x, h.z) + 6 });
  }
  for (const p of PADDIES) {
    const paddy = makePaddy(p.w, p.d, p.color);
    paddy.position.set(p.x, ground(p.x, p.z) + 0.02, p.z);
    scene.add(paddy);
  }
  for (const l of LANTERNS) {
    const lantern = makeLantern();
    lantern.position.set(l.x, ground(l.x, l.z), l.z);
    scene.add(lantern);
    collision.addCircle({ x: l.x, z: l.z, r: 0.15 });
  }
  const faceToward = (obj, x, z, tx, tz) => { obj.rotation.y = Math.atan2(tx - x, tz - z); };
  for (const s of WELCOME_SIGNS) {
    const sign = makeSign(s.lines, { width: 1.8, height: 0.9 });
    sign.position.set(s.x, ground(s.x, s.z), s.z);
    sign.rotation.y = 0; // menghadap selatan, arah kurir datang
    scene.add(sign);
    collision.addCircle({ x: s.x, z: s.z, r: 0.15 });
  }

  // --- Desa 1: tuas membuka gerbang ---
  const gate1 = new Gate(ctx, PUZZLES.gate1);
  const lever = new Lever(ctx, { ...PUZZLES.lever, gate: gate1 });
  const gate1Hint = new LockedGate({
    gate: gate1, flag: 'leverPulled', canOpen: () => false,
    lockedPrompt: 'Gerbang tertutup', lockedMessage: 'Gerbang ini dibuka dengan tuas. Cari di sekitar rumah warga.',
  });

  // --- Desa 2: kunci membuka gerbang menuju sungai ---
  const gate2 = new Gate(ctx, PUZZLES.gate2);
  const key = new KeyPickup(ctx, PUZZLES.key);
  const gate2Lock = new LockedGate({
    gate: gate2, flag: 'gate2Open', canOpen: (f) => !!f.keyTaken,
    openPrompt: 'Buka gerbang dengan kunci', lockedPrompt: 'Gerbang terkunci',
    lockedMessage: 'Terkunci. Kuncinya pasti ada di salah satu rumah di desa ini.',
    openMessage: 'Gerbang terbuka. Sungai ada di depan!',
  });

  // --- Desa 3: gembok kode pada pagar rumah penerima ---
  const C = PUZZLES.courtyard;
  const gate3 = new Gate(ctx, { x: C.x, z: C.zFront, halfSpan: C.halfW, door: C.door });
  const fenceH = 2.4;
  for (const [x1, z1, x2, z2] of [
    [C.x - C.halfW, C.zFront, C.x - C.halfW, C.zBack],
    [C.x + C.halfW, C.zFront, C.x + C.halfW, C.zBack],
    [C.x - C.halfW, C.zBack, C.x + C.halfW, C.zBack],
  ]) {
    scene.add(makeFence(terrain, x1, z1, x2, z2, fenceH));
    const top = Math.max(ground(x1, z1), ground(x2, z2)) + fenceH + 1;
    collision.addBox({
      x: (x1 + x2) / 2, z: (z1 + z2) / 2,
      hx: Math.max(0.2, Math.abs(x2 - x1) / 2), hz: Math.max(0.2, Math.abs(z2 - z1) / 2), yMax: top,
    });
  }
  const codeLock = new CodeLock({ gate: gate3, code: PUZZLES.code });
  const gateSign = makeSign(['RUMAH BU RATNA', 'Gembok: angka I - II - III'], { width: 2.2, height: 0.9 });
  gateSign.position.set(C.x + C.door / 2 + 1.4, ground(C.x + 3.2, C.zFront + 0.8), C.zFront + 0.8);
  scene.add(gateSign);
  PUZZLES.codeSigns.forEach((p, i) => {
    const sign = makeSign([String(PUZZLES.code[i]), ['I', 'II', 'III'][i]], { width: 0.9, height: 1.1, big: true });
    sign.position.set(p.x, ground(p.x, p.z), p.z);
    faceToward(sign, p.x, p.z, 0, -120);
    scene.add(sign);
    collision.addCircle({ x: p.x, z: p.z, r: 0.15 });
  });
  const recipient = new Recipient(ctx, PUZZLES.recipient);

  const checkpoints = CHECKPOINTS.map((c) => new Checkpoint(ctx, c));
  const gates = [gate1, gate2, gate3];
  const interactables = [lever, gate1Hint, key, gate2Lock, codeLock, recipient];

  return {
    interactables,
    checkpoints,
    gates,
    applyProgress(progress) {
      const f = progress.flags;
      gate1.setOpen(!!f.leverPulled, true);
      gate2.setOpen(!!f.gate2Open, true);
      gate3.setOpen(!!f.codeOpen, true);
      for (const it of interactables) it.applyProgress(f);
      checkpoints.forEach((c) => c.setActive(c.village <= progress.village));
    },
    update(dt) {
      for (const g of gates) g.update(dt);
      for (const it of interactables) it.update(dt);
      for (const c of checkpoints) c.update(dt);
    },
  };
}
