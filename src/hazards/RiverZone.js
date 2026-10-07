import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Hazard } from './Hazard.js';

/**
 * Area sungai: selama kaki kurir berada di bawah permukaan air, paket rusak sedikit demi sedikit.
 * Batu pijakan memungkinkan menyeberang tanpa basah bila lompatannya tepat.
 * Permukaan air (shader) dibuat di World.js.
 */
export class RiverZone extends Hazard {
  constructor(ctx, river, layout) {
    super(ctx);
    this.river = river;
    this.inWater = false;
    this._accum = 0;

    // Batu pijakan
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#b3ad9f', flatShading: true, roughness: 0.9 });
    for (const s of layout.stones) {
      const bed = ctx.terrain.heightAt(s.x, s.z);
      const top = river.surfaceY + 0.25;
      const h = top - bed + 0.1;
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, h, 6), stoneMat);
      stone.position.set(s.x, bed + h / 2 - 0.1, s.z);
      stone.rotation.y = Math.random() * Math.PI;
      stone.castShadow = stone.receiveShadow = true;
      stone.updateMatrixWorld();
      ctx.scene.add(stone);
      ctx.collision.addWalkable(stone);
    }
  }

  reset() {
    this.inWater = false;
    this._accum = 0;
    this.ctx.player.speedMultiplier = 1;
  }

  update(dt) {
    const R = CONFIG.hazards.river;
    const p = this.ctx.player.position;
    const inBand = Math.abs(p.z - this.river.zc) < this.river.halfWidth + this.river.bank;
    const wet = inBand && p.y < this.river.surfaceY - 0.05;
    if (wet && !this.inWater) this.ctx.hud.toast('Paket kena air! Cepat menyeberang.', 1.6);
    this.inWater = wet;
    this.ctx.player.speedMultiplier = wet ? R.speedMultiplier : 1;
    if (!wet) return;

    // Kumpulkan damage per detik lalu terapkan per 1 poin supaya HUD tidak berkedip tiap frame
    this._accum += R.packageDamagePerSecond * dt;
    if (this._accum >= 1) {
      const whole = Math.floor(this._accum);
      this._accum -= whole;
      this.damage({ package: whole }, 'Sungai');
    }
  }
}
