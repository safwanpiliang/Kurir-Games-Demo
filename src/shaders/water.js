import * as THREE from 'three';

// Shader air sungai: gradasi dangkal->dalam, gelombang di vertex, garis arus, dan busa di tepi
// (tepi = kedalaman kecil, plus lingkaran busa di sekitar batu pijakan).

const vertexShader = /* glsl */ `
  attribute float aDepth;          // kedalaman air di titik ini (permukaan - dasar)
  uniform float uTime;
  varying float vDepth;
  varying vec3 vWorld;
  #include <fog_pars_vertex>

  void main() {
    vec3 p = position;
    // Dua gelombang kecil; diredam di tepi supaya tidak "naik" ke tanah
    float damp = smoothstep(0.0, 0.4, aDepth);
    p.y += (sin(p.x * 0.55 + uTime * 1.6) * 0.05 + sin(p.z * 1.3 + p.x * 0.25 - uTime * 2.1) * 0.035) * damp;
    vDepth = aDepth;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #define STONES 6
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec2 uStones[STONES];
  uniform float uFlowSpeed;
  varying float vDepth;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    float d = clamp(vDepth, 0.0, 1.5);
    vec3 col = mix(uShallow, uDeep, smoothstep(0.05, 1.0, d));

    // Garis arus mengalir ke +x
    vec2 flowUv = vec2(vWorld.x - uTime * uFlowSpeed, vWorld.z * 2.5);
    float streak = smoothstep(0.62, 0.85, noise(flowUv * vec2(0.35, 0.9)));
    col += streak * 0.12;

    // Busa di tepi (dangkal) dan di sekitar batu, beriak mengikuti waktu
    float n = noise(vWorld.xz * 1.7 + vec2(uTime * 0.6, 0.0));
    float edge = 1.0 - smoothstep(0.0, 0.14 + n * 0.1, d);
    float ring = 0.0;
    for (int i = 0; i < STONES; i++) {
      float r = length(vWorld.xz - uStones[i]);
      ring = max(ring, 1.0 - smoothstep(0.7, 1.05 + n * 0.25, r));
    }
    float foam = clamp(max(edge, ring * 0.85), 0.0, 1.0);
    col = mix(col, uFoam, foam);

    float alpha = mix(0.55, 0.9, smoothstep(0.0, 0.8, d));
    alpha = max(alpha, foam * 0.95);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/**
 * Buat mesh air untuk pita sungai.
 * @param terrain   untuk menghitung kedalaman per vertex
 * @param river     { zc, halfWidth, bank, surfaceY }
 * @param stones    [{x, z}] batu pijakan (lingkaran busa)
 */
export function createWater(terrain, river, stones) {
  const width = (river.halfWidth + river.bank) * 2;
  const geo = new THREE.PlaneGeometry(terrain.size, width, 140, 14);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, river.surfaceY, river.zc);
  const pos = geo.attributes.position;
  const depth = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    depth[i] = river.surfaceY - terrain.heightAt(pos.getX(i), pos.getZ(i));
  }
  geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  const stoneUniform = Array.from({ length: 6 }, (_, i) => new THREE.Vector2(stones[i]?.x ?? 1e4, stones[i]?.z ?? 1e4));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uShallow: { value: new THREE.Color('#5fd3c4') },
        uDeep: { value: new THREE.Color('#13706f') },
        uFoam: { value: new THREE.Color('#d8ece6') },
        uFlowSpeed: { value: 1.4 },
        uStones: { value: stoneUniform },
      },
    ]),
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'sungai';
  mesh.renderOrder = 1;
  return mesh;
}
