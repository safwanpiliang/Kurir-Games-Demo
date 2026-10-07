import * as THREE from 'three';

// Pembuat properti low-poly dari geometri bawaan Three.js (rumah, pagar, papan, warga, lampion).
// Material dipakai bersama supaya jumlah draw state kecil.

const matCache = new Map();
export function flat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra }));
  }
  return matCache.get(key);
}

function shadowed(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

/**
 * Rumah panggung beratap limas. Origin di tengah lantai tanah.
 * Mengembalikan { group, hx, hz } untuk collider.
 */
export function makeHouse({ w = 6, d = 5, wall = '#e8d5a9', roof = '#a4452c', yaw = 0 } = {}) {
  const g = new THREE.Group();
  const stiltH = 0.9, wallH = 2.4;
  const wood = flat('#7a5233');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, stiltH, 6), wood);
    s.position.set(sx * (w / 2 - 0.3), stiltH / 2, sz * (d / 2 - 0.3));
    g.add(s);
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.2, d + 0.4), wood);
  floor.position.y = stiltH;
  g.add(floor);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), flat(wall));
  body.position.y = stiltH + wallH / 2 + 0.1;
  g.add(body);
  // Pintu dan jendela (sisi +z = depan)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.7, 0.08), flat('#5b3a21'));
  door.position.set(0, stiltH + 0.95, d / 2 + 0.03);
  g.add(door);
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.08), flat('#3b2a1a'));
    win.position.set(sx * w * 0.3, stiltH + 1.5, d / 2 + 0.03);
    g.add(win);
  }
  // Atap limas: piramida 4 sisi yang dipipihkan sesuai ukuran rumah
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2 * 2, 1, 4), flat(roof));
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.scale.set((w + 1.4) / 2, 2.2, (d + 1.4) / 2);
  roofMesh.position.y = stiltH + wallH + 0.1 + 1.1;
  g.add(roofMesh);
  // Tangga depan
  const stairs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), wood);
  stairs.position.set(0, 0.45, d / 2 + 0.7);
  stairs.rotation.x = -0.6;
  g.add(stairs);
  g.rotation.y = yaw;
  return { group: shadowed(g), hx: w / 2 + 0.2, hz: d / 2 + 0.2 };
}

/** Pagar bambu dari (x1,z1) ke (x2,z2); tinggi tiang mengikuti terrain. */
export function makeFence(terrain, x1, z1, x2, z2, height = 2.2) {
  const g = new THREE.Group();
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(len / 1.6));
  const post = flat('#8a6a3a');
  const rail = flat('#c9a35c');
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
    const y = terrain.heightAt(x, z);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, height, 5), post);
    p.position.set(x, y + height / 2 - 0.1, z);
    g.add(p);
  }
  const yaw = Math.atan2(x2 - x1, z2 - z1);
  const midY = (terrain.heightAt(x1, z1) + terrain.heightAt(x2, z2)) / 2;
  for (const h of [0.6, 1.3, 1.95]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, len), rail);
    r.position.set((x1 + x2) / 2, midY + h, (z1 + z2) / 2);
    r.rotation.y = yaw;
    g.add(r);
  }
  return shadowed(g);
}

/** Papan kayu bertulisan (CanvasTexture). lines: array teks; baris pertama dicetak besar. */
export function makeSign(lines, { width = 1.4, height = 1.0, big = false } = {}) {
  const g = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.round(256 * (height / width));
  const c = canvas.getContext('2d');
  c.fillStyle = '#d9b77a';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = '#7a5233';
  c.lineWidth = 10;
  c.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  c.fillStyle = '#3b2412';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const rows = lines.length;
  lines.forEach((text, i) => {
    const size = i === 0 && big ? canvas.height * 0.5 : canvas.height * 0.17;
    c.font = `bold ${size}px "Trebuchet MS", sans-serif`;
    const y = big && rows > 1
      ? (i === 0 ? canvas.height * 0.42 : canvas.height * 0.8)
      : canvas.height * ((i + 0.5) / rows);
    c.fillText(text, canvas.width / 2, y);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.08),
    [flat('#7a5233'), flat('#7a5233'), flat('#7a5233'), flat('#7a5233'),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), flat('#7a5233')],
  );
  board.position.y = 1.3 + height / 2;
  g.add(board);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.4 + height / 2, 5), flat('#6e4a2b'));
  pole.position.y = (1.4 + height / 2) / 2;
  g.add(pole);
  return shadowed(g);
}

/** Warga sederhana (penerima paket, dsb.) dengan bentuk sama seperti kurir. */
export function makePerson({ shirt = '#c0392b', skirt = '#6d3b8c', hat = null } = {}) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.45, 3, 8), flat(shirt));
  torso.position.y = 1.05;
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.75, 8), flat(skirt));
  legs.position.y = 0.38;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), flat('#c68e5a'));
  head.position.y = 1.55;
  const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 0), flat('#2b1d14'));
  hair.position.set(0, 1.6, 0.05);
  hair.scale.set(1, 0.8, 1);
  g.add(torso, legs, head, hair);
  if (hat) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.18, 8), flat(hat));
    h.position.y = 1.72;
    g.add(h);
  }
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), flat(shirt));
    arm.position.set(sx * 0.38, 1.05, 0);
    arm.rotation.z = sx * 0.15;
    g.add(arm);
  }
  return shadowed(g);
}

/** Lampion bertiang dengan cahaya emissive (tampak menyala dengan bloom). */
export function makeLantern(color = '#ffb347') {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5), flat('#5b3a21'));
  pole.position.y = 1.1;
  const lamp = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({ color: '#222', emissive: color, emissiveIntensity: 2.2, flatShading: true }),
  );
  lamp.position.y = 2.35;
  g.add(pole, lamp);
  return shadowed(g);
}

/** Petak sawah: bidang datar berwarna padi dengan pematang. */
export function makePaddy(w, d, color = '#9cc45a') {
  const g = new THREE.Group();
  const field = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), flat(color));
  field.receiveShadow = true;
  g.add(field);
  const dike = flat('#8a6f45');
  for (const [sx, sz, lw, ld] of [[0, d / 2, w + 0.4, 0.3], [0, -d / 2, w + 0.4, 0.3], [w / 2, 0, 0.3, d], [-w / 2, 0, 0.3, d]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.3, ld), dike);
    m.position.set(sx, 0.05, sz);
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
