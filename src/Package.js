import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Health } from './Health.js';

const GOOD = new THREE.Color('#3dff9a');
const WARN = new THREE.Color('#ffd23d');
const BAD = new THREE.Color('#ff3d2e');
const FLASH = new THREE.Color('#ffffff');

/**
 * Paket rapuh yang dibawa kurir. Punya Health sendiri, terpisah dari health kurir.
 * Pita dan label emissive berubah hijau -> kuning -> merah mengikuti health, dan berdenyut saat kritis.
 */
export class Package {
  constructor() {
    const P = CONFIG.package;
    this.health = new Health(P.maxHealth);
    this.flash = 0;
    this.time = 0;
    this._color = new THREE.Color();
    this._worldPos = new THREE.Vector3();

    this.mesh = new THREE.Group();
    this.mesh.name = 'paket';
    const s = P.size;
    // Kotak terbungkus kain cokelat
    const wrap = new THREE.Mesh(
      new THREE.BoxGeometry(s[0], s[1], s[2]),
      new THREE.MeshStandardMaterial({ color: '#8c5a3c', flatShading: true, roughness: 0.9 }),
    );
    this.mesh.add(wrap);

    // Pita/tali yang menyala sebagai indikator health
    this.glowMat = new THREE.MeshStandardMaterial({
      color: '#111', emissive: GOOD.clone(), emissiveIntensity: 1, flatShading: true,
    });
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(s[0] + 0.02, s[1] + 0.02, 0.06), this.glowMat);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, s[1] + 0.02, s[2] + 0.02), this.glowMat);
    this.mesh.add(band1, band2);
    // Simpul di atas
    const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), this.glowMat);
    knot.position.y = s[1] / 2 + 0.04;
    this.mesh.add(knot);

    this.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    this.health.onChange((_cur, delta) => { if (delta < 0) this.flash = 0.25; });
    this.#applyColor();
  }

  attachTo(socket) { socket.add(this.mesh); }

  worldPosition() { return this.mesh.getWorldPosition(this._worldPos); }

  update(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.#applyColor();
  }

  #applyColor() {
    const P = CONFIG.package;
    const r = this.health.ratio;
    const c = this._color;
    // Hijau (utuh) -> kuning -> merah (kritis)
    if (r >= 0.6) c.copy(WARN).lerp(GOOD, (r - 0.6) / 0.4);
    else if (r > P.criticalRatio) c.copy(BAD).lerp(WARN, (r - P.criticalRatio) / (0.6 - P.criticalRatio));
    else c.copy(BAD);
    let intensity = P.glowIntensity;
    // Berdenyut saat kritis
    if (r <= P.criticalRatio) intensity *= 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(this.time * 10));
    if (this.flash > 0) {
      c.lerp(FLASH, this.flash / 0.25);
      intensity = P.glowIntensity * 1.8;
    }
    this.glowMat.emissive.copy(c);
    this.glowMat.emissiveIntensity = intensity;
  }
}
