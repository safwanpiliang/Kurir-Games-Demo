import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Hazard } from './Hazard.js';

/**
 * Kayu tumbang: saat kurir melewati trigger, pohon di pinggir jalur sempit bergoyang
 * lalu tumbang melintang jalur. Yang tertimpa: damage ke kurir dan paket.
 * Setelah tumbang, batang tetap di jalur sebagai rintangan yang bisa dilompati.
 */
export class FallingTree extends Hazard {
  constructor(ctx, layout) {
    super(ctx);
    const T = CONFIG.hazards.fallingTree;
    this.layout = layout;
    const { pivot } = layout;
    this.baseY = ctx.terrain.heightAt(pivot.x, pivot.z);

    // Pohon tumbang ke arah -x (melintang jalur). Hitung sudut akhir agar ujung menyentuh tanah.
    const tipX = pivot.x - T.length;
    const tipY = ctx.terrain.heightAt(tipX, pivot.z);
    this.restAngle = Math.PI / 2 - Math.atan2(tipY - this.baseY, T.length);

    this.pivot = new THREE.Group();
    this.pivot.position.set(pivot.x, this.baseY + T.trunkRadius * 0.5, pivot.z);
    const bark = new THREE.MeshStandardMaterial({ color: '#7a5233', flatShading: true });
    const leaf = new THREE.MeshStandardMaterial({ color: '#3f8f4f', flatShading: true });
    this.trunk = new THREE.Mesh(new THREE.CylinderGeometry(T.trunkRadius * 0.75, T.trunkRadius, T.length, 7), bark);
    this.trunk.position.y = T.length / 2;
    this.pivot.add(this.trunk);
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.0 - i * 0.5, 2.4, 7), leaf);
      cone.position.y = T.length * 0.62 + i * 1.3;
      this.pivot.add(cone);
    }
    this.pivot.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ctx.scene.add(this.pivot);

    this.reset();
  }

  reset() {
    const { pivot } = this.layout;
    this.state = 'standing'; // standing | warning | falling | down
    this.timer = 0;
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld(true);
    if (this.logCollider) this.ctx.collision.remove(this.logCollider);
    this.ctx.collision.removeWalkable(this.trunk);
    this.logCollider = null;
    if (!this.standCollider) {
      this.standCollider = this.ctx.collision.addCircle({ x: pivot.x, z: pivot.z, r: CONFIG.hazards.fallingTree.trunkRadius });
    }
    this.standCollider.enabled = true;
  }

  update(dt) {
    const T = CONFIG.hazards.fallingTree;
    const p = this.ctx.player.position;
    const { trigger } = this.layout;

    if (this.state === 'standing') {
      if (Math.hypot(p.x - trigger.x, p.z - trigger.z) < T.triggerRadius) {
        this.state = 'warning';
        this.timer = 0;
        this.ctx.hud.toast('Krek... ada pohon akan tumbang!', 1.8);
      }
    } else if (this.state === 'warning') {
      this.timer += dt;
      this.pivot.rotation.z = Math.sin(this.timer * 40) * 0.02 + this.timer * 0.03; // bergoyang
      if (this.timer >= T.warnTime) { this.state = 'falling'; this.timer = 0; }
    } else if (this.state === 'falling') {
      this.timer += dt;
      const t = Math.min(1, this.timer / T.fallTime);
      this.pivot.rotation.z = 0.02 + (this.restAngle - 0.02) * t * t; // makin cepat seperti jatuh
      if (t >= 1) this.#land();
    }
  }

  #land() {
    const T = CONFIG.hazards.fallingTree;
    this.state = 'down';
    this.pivot.rotation.z = this.restAngle;
    this.pivot.updateMatrixWorld(true);

    // Kena kurir? (jarak horizontal ke garis batang)
    const { pivot } = this.layout;
    const p = this.ctx.player.position;
    const minX = pivot.x - T.length, maxX = pivot.x;
    const cx = Math.max(minX, Math.min(maxX, p.x));
    const dist = Math.hypot(p.x - cx, p.z - pivot.z);
    if (dist < T.trunkRadius + CONFIG.player.radius + T.hitMargin) {
      this.damage({ player: T.playerDamage, package: T.packageDamage }, 'Kayu tumbang');
      this.ctx.player.velocity.z += Math.sign(p.z - pivot.z || 1) * 5; // terdorong keluar
    }

    // Batang menjadi rintangan: collider samping + permukaan yang bisa dipijak
    this.standCollider.enabled = false;
    // Puncak batang di tengah panjangnya (sumbu batang + radius)
    const topY = this.pivot.position.y + (T.length / 2) * Math.cos(this.restAngle) + T.trunkRadius;
    this.logCollider = this.ctx.collision.addBox({
      x: pivot.x - T.length / 2, z: pivot.z, hx: T.length / 2, hz: T.trunkRadius,
      yMin: this.baseY - 3, yMax: topY,
    });
    this.ctx.collision.addWalkable(this.trunk);
  }
}
