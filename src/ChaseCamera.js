import * as THREE from 'three';
import { CONFIG } from './config.js';

const DEG = Math.PI / 180;

/**
 * Kamera orang ketiga: berputar mengikuti mouse (yaw/pitch), mengikuti kurir dengan smoothing,
 * dan memendek bila terhalang terrain agar tidak menembus tebing.
 */
export class ChaseCamera {
  constructor(camera, terrain) {
    this.camera = camera;
    this.terrain = terrain;
    this.yaw = 0;   // 0 = melihat ke -z
    this.pitch = CONFIG.camera.initialPitchDeg * DEG;
    this.focus = new THREE.Vector3();
    this.distance = CONFIG.camera.distance;
    this._dir = new THREE.Vector3();
    this._target = new THREE.Vector3();
  }

  rotate(dx, dy, sensitivity) {
    const C = CONFIG.camera;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = Math.max(C.minPitchDeg * DEG, Math.min(C.maxPitchDeg * DEG, this.pitch));
  }

  // Langsung lompat ke target (dipakai saat spawn/respawn)
  snap(targetPos, yaw = this.yaw) {
    this.yaw = yaw;
    this.focus.copy(targetPos).y += CONFIG.camera.targetHeight;
    this.distance = CONFIG.camera.distance;
    this.update(0, targetPos);
  }

  update(dt, targetPos) {
    const C = CONFIG.camera;
    this._target.copy(targetPos).y += C.targetHeight;
    const k = dt > 0 ? 1 - Math.exp(-C.followSmoothing * dt) : 1;
    this.focus.lerp(this._target, k);

    // Arah pandang kamera
    const cp = Math.cos(this.pitch);
    this._dir.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);

    // Cari jarak terjauh yang tidak menembus terrain (sampel sepanjang garis)
    let maxDist = C.distance;
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const d = (C.distance * i) / steps;
      const x = this.focus.x - this._dir.x * d;
      const y = this.focus.y - this._dir.y * d;
      const z = this.focus.z - this._dir.z * d;
      if (y < this.terrain.heightAt(x, z) + C.groundClearance * 0.5) {
        maxDist = Math.max(C.minDistance, (C.distance * (i - 1)) / steps);
        break;
      }
    }
    // Memendek seketika, memanjang kembali dengan halus
    this.distance = maxDist < this.distance ? maxDist : this.distance + (maxDist - this.distance) * k;

    const cam = this.camera.position;
    cam.copy(this.focus).addScaledVector(this._dir, -this.distance);
    const minY = this.terrain.heightAt(cam.x, cam.z) + C.groundClearance;
    if (cam.y < minY) cam.y = minY;
    this.camera.lookAt(this.focus);
  }
}
