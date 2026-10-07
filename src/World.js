import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Terrain } from './Terrain.js';

/**
 * Dunia: terrain, pencahayaan, dan dekorasi lingkungan.
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    scene.background = new THREE.Color('#9fc9d6');

    this.terrain = new Terrain();
    scene.add(this.terrain.mesh);

    // Cahaya langit + matahari senja dari sudut rendah
    this.hemi = new THREE.HemisphereLight('#cfe8ff', '#6b5a3a', 0.9);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#ffd9a0', 2.2);
    this.sunOffset = new THREE.Vector3(-40, 35, 25);
    this.sun.castShadow = CONFIG.render.shadows;
    const s = this.sun.shadow;
    const r = CONFIG.render.shadowRange;
    s.mapSize.set(CONFIG.render.shadowMapSize, CONFIG.render.shadowMapSize);
    s.camera.left = -r; s.camera.right = r; s.camera.top = r; s.camera.bottom = -r;
    s.camera.near = 1; s.camera.far = 160;
    s.bias = -0.0005;
    s.normalBias = 0.05;
    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  // Matahari (dan kotak bayangannya) mengikuti kurir supaya bayangan tetap tajam
  update(_dt, focus) {
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).add(this.sunOffset);
  }
}
