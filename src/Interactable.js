import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * Kelas dasar semua objek yang bisa dipakai dengan tombol E
 * (tuas, kunci, gembok, kode, penerima paket). Padanan di Unreal: BPI_Overlap.
 *
 * Subkelas meng-override getPrompt(), canInteract(), interact(), dan opsional update().
 * `game` adalah objek dari main.js: { hud, progress, setFlag, openKeypad, deliver }.
 */
export class Interactable {
  constructor({ x, y = 0, z, radius = CONFIG.interact.radius, prompt = 'Berinteraksi' }) {
    this.position = new THREE.Vector3(x, y, z);
    this.radius = radius;
    this.prompt = prompt;
    this.enabled = true;
  }

  /** Teks di samping [E]; boleh berubah sesuai keadaan. */
  getPrompt(_game) { return this.prompt; }

  canInteract(_game) { return this.enabled; }

  interact(_game) {}

  update(_dt) {}

  /** Kembalikan visual sesuai flag progres (dipanggil saat mulai/respawn). */
  applyProgress(_flags) {}

  distanceTo(pos) {
    return Math.hypot(pos.x - this.position.x, pos.z - this.position.z);
  }
}

/** Cari interactable terdekat yang bisa dipakai dalam jangkauan. */
export function findInteractable(list, pos, game) {
  let best = null, bestD = Infinity;
  for (const it of list) {
    if (!it.canInteract(game)) continue;
    const d = it.distanceTo(pos);
    if (d < it.radius && d < bestD) { best = it; bestD = d; }
  }
  return best;
}
