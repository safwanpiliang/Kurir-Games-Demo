import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { makeFence, flat } from '../props.js';

/**
 * Gerbang dua daun pintu di tengah pagar yang melintang sepanjang sumbu x.
 * Pagar dan pintu punya collider; saat dibuka, collider pintu dimatikan lalu daun pintu berayun.
 */
export class Gate {
  constructor(ctx, { x, z, halfSpan, door }) {
    this.ctx = ctx;
    this.x = x;
    this.z = z;
    this.door = door;
    this.isOpen = false;
    this.t = 0; // 0 tertutup, 1 terbuka penuh

    const T = ctx.terrain;
    const fenceH = 2.4;
    const segments = [[x - halfSpan, x - door / 2], [x + door / 2, x + halfSpan]];
    for (const [a, b] of segments) {
      ctx.scene.add(makeFence(T, a, z, b, z, fenceH));
      const top = Math.max(T.heightAt(a, z), T.heightAt(b, z), T.heightAt((a + b) / 2, z));
      ctx.collision.addBox({ x: (a + b) / 2, z, hx: (b - a) / 2, hz: 0.2, yMax: top + fenceH + 1 });
    }

    // Gapura: dua tiang tinggi + balok atas
    const gy = T.heightAt(x, z);
    const pillarMat = flat('#6e4a2b');
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 0.4), pillarMat);
      p.position.set(x + sx * (door / 2 + 0.2), gy + 1.7, z);
      p.castShadow = true;
      ctx.scene.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(door + 1.4, 0.35, 0.5), flat('#a4452c'));
    beam.position.set(x, gy + 3.5, z);
    beam.castShadow = true;
    ctx.scene.add(beam);

    // Daun pintu berporos di sisi luar
    this.leaves = [];
    const slatMat = flat('#b88a4a');
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x + side * (door / 2), gy, z);
      const w = door / 2 - 0.05;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(w / n - 0.04, 2.0, 0.08), slatMat);
        slat.position.set(-side * (w / n) * (i + 0.5), 1.05, 0);
        slat.castShadow = true;
        pivot.add(slat);
      }
      const brace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), flat('#6e4a2b'));
      brace.position.set(-side * w / 2, 1.5, 0.06);
      pivot.add(brace);
      ctx.scene.add(pivot);
      this.leaves.push({ pivot, side });
    }
    this.collider = ctx.collision.addBox({ x, z, hx: door / 2, hz: 0.2, yMax: gy + 4 });
  }

  /** Buka/tutup. instant=true untuk memuat dari save tanpa animasi. */
  setOpen(open, instant = false) {
    this.isOpen = open;
    this.collider.enabled = !open;
    if (instant) { this.t = open ? 1 : 0; this.#pose(); }
  }

  update(dt) {
    const target = this.isOpen ? 1 : 0;
    if (this.t === target) return;
    const step = dt / CONFIG.puzzles.gateOpenTime;
    this.t = target > this.t ? Math.min(1, this.t + step) : Math.max(0, this.t - step);
    this.#pose();
  }

  #pose() {
    const e = 1 - (1 - this.t) * (1 - this.t); // ease-out
    // Daun pintu berayun ke arah -z (menjauhi kurir yang datang dari selatan)
    for (const { pivot, side } of this.leaves) pivot.rotation.y = -side * e * 1.75;
  }
}
