import * as THREE from 'three';
import { Interactable } from '../Interactable.js';
import { flat } from '../props.js';

/** Puzzle desa 1: tuas yang membuka gerbang Lembah Padi. */
export class Lever extends Interactable {
  constructor(ctx, { x, z, gate }) {
    super({ x, z, prompt: 'Tarik tuas' });
    this.gate = gate;
    this.pulled = false;
    this.angle = -0.7;

    const y = ctx.terrain.heightAt(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.6), flat('#8d8a80'));
    base.position.y = 0.5;
    g.add(base);
    this.handle = new THREE.Group();
    this.handle.position.y = 1.0;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), flat('#5b3a21'));
    stick.position.y = 0.5;
    const knob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.12, 0),
      new THREE.MeshStandardMaterial({ color: '#c0392b', emissive: '#ff5533', emissiveIntensity: 0.8, flatShading: true }),
    );
    knob.position.y = 1.0;
    this.handle.add(stick, knob);
    g.add(this.handle);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    ctx.scene.add(g);
    ctx.collision.addBox({ x, z, hx: 0.45, hz: 0.3, yMax: y + 1.0 });
  }

  canInteract() { return !this.pulled; }

  interact(game) {
    this.pulled = true;
    this.gate.setOpen(true);
    game.setFlag('leverPulled');
    game.hud.toast('Kreeek... gerbang desa terbuka!', 2.2);
  }

  applyProgress(flags) {
    this.pulled = !!flags.leverPulled;
    this.angle = this.pulled ? 0.7 : -0.7;
    this.handle.rotation.x = this.angle;
  }

  update(dt) {
    const target = this.pulled ? 0.7 : -0.7;
    this.angle += (target - this.angle) * Math.min(1, dt * 8);
    this.handle.rotation.x = this.angle;
  }
}
