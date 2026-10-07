import * as THREE from 'three';
import { Interactable } from '../Interactable.js';
import { flat } from '../props.js';

/** Puzzle desa 2 (bagian 1): kunci yang tergeletak di meja salah satu rumah. */
export class KeyPickup extends Interactable {
  constructor(ctx, { x, z }) {
    super({ x, z, prompt: 'Ambil kunci' });
    this.time = 0;
    const y = ctx.terrain.heightAt(x, z);

    // Meja kecil
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), flat('#8a6a3a'));
    table.position.set(x, y + 0.4, z);
    table.castShadow = table.receiveShadow = true;
    ctx.scene.add(table);
    ctx.collision.addBox({ x, z, hx: 0.6, hz: 0.4, yMax: y + 0.8 });

    // Kunci emas yang berputar pelan
    const gold = new THREE.MeshStandardMaterial({ color: '#e9c46a', emissive: '#e9a83a', emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3, flatShading: true });
    this.key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 5, 10), gold);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), gold);
    shaft.position.y = -0.27;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), gold);
    tooth.position.set(0.06, -0.38, 0);
    this.key.add(ring, shaft, tooth);
    this.key.position.set(x, y + 1.25, z);
    ctx.scene.add(this.key);
    this.baseY = this.key.position.y;
  }

  canInteract(game) { return !game.progress.flags.keyTaken; }

  interact(game) {
    game.setFlag('keyTaken');
    this.key.visible = false;
    game.hud.toast('Kunci didapat! Bawa ke gerbang menuju sungai.', 2.5);
  }

  applyProgress(flags) { this.key.visible = !flags.keyTaken; }

  update(dt) {
    this.time += dt;
    this.key.rotation.y += dt * 1.5;
    this.key.position.y = this.baseY + Math.sin(this.time * 2) * 0.06;
  }
}
