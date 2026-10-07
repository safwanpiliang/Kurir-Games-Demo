import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';

// Color grading sederhana (di ruang linear, sebelum tone mapping OutputPass):
// saturasi, kontras, sedikit hangat, dan vignette.
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uWarmth: { value: 0 },
    uVignette: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation, uContrast, uWarmth, uVignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSaturation);
      c.rgb = (c.rgb - 0.18) * uContrast + 0.18;          // kontras di sekitar abu-abu tengah
      c.rgb *= vec3(1.0 + uWarmth, 1.0, 1.0 - uWarmth);
      float v = smoothstep(0.85, 0.25, length(vUv - 0.5));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      gl_FragColor = vec4(max(c.rgb, 0.0), c.a);
    }
  `,
};

/**
 * EffectComposer: render -> bloom (opsional) -> color grading -> output (tone mapping + sRGB).
 */
export class PostFX {
  constructor(renderer, scene, camera) {
    const R = CONFIG.render;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const size = renderer.getSize(new THREE.Vector2());
    // Resolusi bloom setengah layar supaya ringan
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), R.bloomStrength, R.bloomRadius, R.bloomThreshold);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(ColorGradeShader);
    this.grade.uniforms.uSaturation.value = R.saturation;
    this.grade.uniforms.uContrast.value = R.contrast;
    this.grade.uniforms.uWarmth.value = R.warmth;
    this.grade.uniforms.uVignette.value = R.vignette;
    this.composer.addPass(this.grade);

    this.composer.addPass(new OutputPass());
  }

  setBloom(on) { this.bloom.enabled = on; }

  setSize(w, h) {
    this.composer.setSize(w, h);
  }

  render() { this.composer.render(); }
}
