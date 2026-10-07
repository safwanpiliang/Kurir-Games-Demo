import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Terrain } from './Terrain.js';
import { RIVER, HAZARD_LAYOUT } from './Level.js';
import { createWater } from './shaders/water.js';
import { buildVegetation } from './Vegetation.js';
import { foliageTime } from './shaders/foliage.js';

const HORIZON = new THREE.Color('#f2c99a'); // keemasan senja, juga warna fog
const ZENITH = new THREE.Color('#5d9fc4');

/**
 * Dunia: terrain, langit, pencahayaan senja, fog, air, dan vegetasi.
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    scene.background = HORIZON.clone();
    scene.fog = new THREE.Fog(HORIZON.clone(), CONFIG.render.fogNear, CONFIG.render.fogFar);

    this.terrain = new Terrain();
    scene.add(this.terrain.mesh);

    // Matahari senja dari sudut rendah + cahaya langit/pantulan tanah
    this.sunOffset = new THREE.Vector3(-62, 30, 38);
    this.sky = this.#buildSky();
    scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight('#bfe0f0', '#7a6440', 1.1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#ffcf8f', 2.6);
    this.sun.castShadow = CONFIG.render.shadows;
    const s = this.sun.shadow;
    const r = CONFIG.render.shadowRange;
    s.mapSize.set(CONFIG.render.shadowMapSize, CONFIG.render.shadowMapSize);
    s.camera.left = -r; s.camera.right = r; s.camera.top = r; s.camera.bottom = -r;
    s.camera.near = 1; s.camera.far = 200;
    s.bias = -0.0005;
    s.normalBias = 0.05;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.water = createWater(this.terrain, RIVER, HAZARD_LAYOUT.river.stones);
    scene.add(this.water);
  }

  /** Pohon/rumput butuh collision untuk collider batang di tepi jalur. */
  addVegetation(collision) {
    buildVegetation(this.scene, this.terrain, collision);
  }

  // Kubah langit: gradasi horizon -> zenit dengan pendar matahari. Tidak terkena fog.
  #buildSky() {
    const sunDir = this.sunOffset.clone().normalize();
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uHorizon: { value: HORIZON },
        uZenith: { value: ZENITH },
        uSunDir: { value: sunDir },
        uSunColor: { value: new THREE.Color('#ffe2b0') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww; // selalu di bidang jauh
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon, uZenith, uSunColor, uSunDir;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
          float sun = max(dot(normalize(vDir), uSunDir), 0.0);
          col += uSunColor * (pow(sun, 8.0) * 0.35 + pow(sun, 400.0) * 1.5);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), mat);
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    return sky;
  }

  update(dt, focus, camera) {
    this.time += dt;
    foliageTime.value = this.time;
    this.water.material.uniforms.uTime.value = this.time;
    // Langit ikut kamera; matahari (dan kotak bayangannya) mengikuti kurir supaya bayangan tetap tajam
    if (camera) this.sky.position.copy(camera.position);
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).add(this.sunOffset);
  }
}
