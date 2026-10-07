import * as THREE from 'three';

const DOWN = new THREE.Vector3(0, -1, 0);

/**
 * Tabrakan ringan tanpa physics engine:
 * - pijakan: tinggi terrain (analitik) + raycast ke bawah ke mesh "walkable" (jembatan, kayu, atap)
 * - dinding: collider lingkaran dan kotak (bisa diputar) yang mendorong kurir keluar secara horizontal
 */
export class Collision {
  constructor(terrain) {
    this.terrain = terrain;
    this.colliders = [];
    this.walkables = [];
    this.raycaster = new THREE.Raycaster();
    this._origin = new THREE.Vector3();
  }

  addCircle({ x, z, r, yMin = -Infinity, yMax = Infinity }) {
    const c = { type: 'circle', x, z, r, yMin, yMax, enabled: true };
    this.colliders.push(c);
    return c;
  }

  // Kotak berorientasi: pusat (x,z), setengah ukuran (hx,hz), rotasi rot (rad, sumbu Y)
  addBox({ x, z, hx, hz, rot = 0, yMin = -Infinity, yMax = Infinity }) {
    const c = { type: 'box', x, z, hx, hz, rot, yMin, yMax, enabled: true };
    this.colliders.push(c);
    return c;
  }

  remove(collider) {
    const i = this.colliders.indexOf(collider);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  addWalkable(mesh) { this.walkables.push(mesh); }

  removeWalkable(mesh) {
    const i = this.walkables.indexOf(mesh);
    if (i >= 0) this.walkables.splice(i, 1);
  }

  /**
   * Permukaan tertinggi di bawah titik (x, fromY, z).
   * onTerrain = true bila permukaannya terrain (dipakai untuk aturan lereng curam).
   */
  groundAt(x, z, fromY) {
    const th = this.terrain.heightAt(x, z);
    let height = th, onTerrain = true, object = null;
    if (this.walkables.length && fromY > th) {
      this._origin.set(x, fromY, z);
      this.raycaster.set(this._origin, DOWN);
      this.raycaster.far = fromY - th + 0.01;
      const hits = this.raycaster.intersectObjects(this.walkables.filter((m) => m.visible), false);
      if (hits.length && hits[0].point.y > th) {
        height = hits[0].point.y;
        onTerrain = false;
        object = hits[0].object;
      }
    }
    return { height, onTerrain, object };
  }

  // Dorong posisi keluar dari collider. feetY dan height dipakai untuk cek tumpang tindih vertikal.
  resolve(pos, radius, height, stepHeight) {
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      // Bisa berdiri di atasnya bila kaki sudah di atas puncak collider
      if (pos.y > c.yMax - stepHeight || pos.y + height < c.yMin) continue;
      if (c.type === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 1e-4;
          pos.x = c.x + (dx / d) * min;
          pos.z = c.z + (dz / d) * min;
        }
      } else {
        // Ke ruang lokal kotak
        const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const qx = Math.max(-c.hx, Math.min(c.hx, lx));
        const qz = Math.max(-c.hz, Math.min(c.hz, lz));
        let ox = lx - qx, oz = lz - qz;
        const d2 = ox * ox + oz * oz;
        if (d2 >= radius * radius) continue;
        let nlx, nlz;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          nlx = qx + (ox / d) * radius;
          nlz = qz + (oz / d) * radius;
        } else {
          // Pusat di dalam kotak: keluarkan lewat sisi terdekat
          const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
          if (px < pz) { nlx = Math.sign(lx || 1) * (c.hx + radius); nlz = lz; }
          else { nlx = lx; nlz = Math.sign(lz || 1) * (c.hz + radius); }
        }
        // Kembali ke ruang dunia (rotasi balik)
        pos.x = c.x + nlx * cos + nlz * sin;
        pos.z = c.z - nlx * sin + nlz * cos;
      }
    }
  }
}
