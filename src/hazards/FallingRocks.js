import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Hazard } from './Hazard.js';

/**
 * Batu longsor: saat kurir masuk area trigger, beberapa batu menggelinding dari lereng barat
 * menyeberangi jalur. Batu mengenai kurir -> damage kurir; mengenai paket langsung -> damage paket.
 * Gerak batu kinematik (mengikuti tinggi terrain), tanpa physics engine.
 */
export class FallingRocks extends Hazard {
  constructor(ctx, layout) {
    super(ctx);
    const R = CONFIG.hazards.fallingRocks;
    this.layout = layout;
    const mat = new THREE.MeshStandardMaterial({ color: '#7d746a', flatShading: true, roughness: 1 });
    this.rocks = [];
    for (let i = 0; i < R.count; i++) {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat);
      mesh.castShadow = true;
      mesh.visible = false;
      ctx.scene.add(mesh);
      this.rocks.push({ mesh, active: false, r: 1, x: 0, z: 0, y: 0, delay: 0, fade: 0, hitPlayer: false, hitPackage: false });
    }
    this.reset();
  }

  reset() {
    this.cooldown = 0;
    this.armed = true; // trigger aktif kembali setelah kurir keluar area
    for (const r of this.rocks) { r.active = false; r.mesh.visible = false; }
  }

  #launch() {
    const R = CONFIG.hazards.fallingRocks;
    const [z0, z1] = this.layout.laneZ;
    this.rocks.forEach((r, i) => {
      r.active = true;
      r.delay = i * R.spawnInterval;
      r.r = R.radiusMin + Math.random() * (R.radiusMax - R.radiusMin);
      r.x = this.layout.fromX - Math.random() * 3;
      r.z = z0 + (z1 - z0) * ((i + Math.random()) / this.rocks.length);
      r.fade = 1;
      r.hitPlayer = false;
      r.hitPackage = false;
      r.mesh.scale.setScalar(r.r);
      r.mesh.visible = false;
    });
    this.ctx.hud.toast('Awas, batu longsor dari lereng!', 2);
  }

  update(dt) {
    const R = CONFIG.hazards.fallingRocks;
    const { trigger } = this.layout;
    const player = this.ctx.player;
    const p = player.position;

    this.cooldown = Math.max(0, this.cooldown - dt);
    const inside = Math.hypot(p.x - trigger.x, p.z - trigger.z) < trigger.r;
    if (inside && this.armed && this.cooldown <= 0) {
      this.#launch();
      this.cooldown = R.cooldown;
      this.armed = false;
    }
    if (!inside) this.armed = true;

    const pkgPos = this.ctx.pkg.worldPosition();
    for (const r of this.rocks) {
      if (!r.active) continue;
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.mesh.visible = true;
      r.x += R.speed * dt;
      r.y = this.ctx.terrain.heightAt(r.x, r.z) + r.r * 0.85;
      r.mesh.position.set(r.x, r.y, r.z);
      r.mesh.rotation.z -= (R.speed / r.r) * dt; // menggelinding ke +x

      // Menghilang setelah melewati jalur
      if (r.x > this.layout.toX) {
        r.fade -= dt * 3;
        r.mesh.scale.setScalar(r.r * Math.max(0, r.fade));
        if (r.fade <= 0) { r.active = false; r.mesh.visible = false; }
        continue;
      }

      // Paket dicek lebih dulu: kena langsung bila batu menyentuh bola paket
      const pkgHit = !r.hitPackage && pkgPos.distanceTo(r.mesh.position) < r.r + CONFIG.package.hitRadius;
      if (pkgHit) r.hitPackage = true;

      // Tabrakan kurir (silinder) — sekali per batu
      let playerHit = false;
      if (!r.hitPlayer) {
        const horiz = Math.hypot(p.x - r.x, p.z - r.z);
        const vertOk = r.y + r.r > p.y && r.y - r.r < p.y + CONFIG.player.height;
        playerHit = vertOk && horiz < r.r + CONFIG.player.radius;
        if (playerHit) r.hitPlayer = true;
      }

      if (playerHit || pkgHit) {
        this.damage({ player: playerHit ? R.playerDamage : 0, package: pkgHit ? R.packageDamage : 0 }, 'Batu longsor');
      }
      if (playerHit) {
        player.velocity.x += R.knockback;
        player.velocity.y = Math.max(player.velocity.y, 3);
        player.grounded = false;
      }
    }
  }
}
