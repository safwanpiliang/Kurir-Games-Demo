import * as THREE from 'three';
import { flat } from './props.js';

const IDLE = new THREE.Color('#2a9d8f');
const ACTIVE = new THREE.Color('#ffc94a');

/**
 * Trigger desa yang menyimpan progres saat kurir tiba (padanan BP_CheckPoint).
 * Visual: tiang bendera di tepi jalur; benderanya menyala keemasan setelah aktif.
 */
export class Checkpoint {
  constructor(ctx, { village, name, x, z, r, spawn, flag }) {
    Object.assign(this, { village, name, x, z, r, spawn });
    this.time = 0;
    const y = ctx.terrain.heightAt(flag.x, flag.z);
    const g = new THREE.Group();
    g.position.set(flag.x, y, flag.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 6), flat('#5b3a21'));
    pole.position.y = 2;
    this.clothMat = new THREE.MeshStandardMaterial({
      color: '#1d6b62', emissive: IDLE.clone(), emissiveIntensity: 0.25, flatShading: true, side: THREE.DoubleSide,
    });
    this.cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8, 4, 1), this.clothMat);
    this.cloth.position.set(0.72, 3.5, 0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 6), flat('#8d8a80'));
    base.position.y = 0.15;
    g.add(pole, this.cloth, base);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    ctx.scene.add(g);
    ctx.collision.addCircle({ x: flag.x, z: flag.z, r: 0.3 });
    this.setActive(false);
  }

  contains(pos) { return Math.hypot(pos.x - this.x, pos.z - this.z) < this.r; }

  setActive(on) {
    this.active = on;
    this.clothMat.emissive.copy(on ? ACTIVE : IDLE);
    this.clothMat.color.set(on ? '#b8862a' : '#1d6b62');
    this.clothMat.emissiveIntensity = on ? 0.35 : 0.15;
  }

  update(dt) {
    // Bendera berkibar sederhana
    this.time += dt;
    this.cloth.rotation.y = Math.sin(this.time * 2.2 + this.village) * 0.25;
  }
}
