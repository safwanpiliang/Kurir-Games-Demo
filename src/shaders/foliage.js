import * as THREE from 'three';

// Goyangan daun/rumput lewat vertex shader. Disuntikkan ke MeshStandardMaterial (onBeforeCompile)
// supaya pencahayaan, bayangan, dan fog bawaan tetap berlaku.

/** Uniform waktu bersama; diperbarui sekali per frame dari World.update(). */
export const foliageTime = { value: 0 };

// Titik di atas `base` bergeser sebanding ketinggiannya; fase berbeda tiap instance
// (dari posisi instance) supaya tidak bergerak serempak.
const SWAY_GLSL = /* glsl */ `
  vec3 swayOrigin = vec3(0.0);
  #ifdef USE_INSTANCING
    swayOrigin = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
  #endif
  float swayH = max(transformed.y - uSway.w, 0.0) * uSway.z;
  float swayPh = uFoliageTime * uSway.y + swayOrigin.x * 0.21 + swayOrigin.z * 0.17;
  transformed.x += (sin(swayPh) + 0.4 * sin(swayPh * 2.3 + 1.3)) * swayH * uSway.x;
  transformed.z += cos(swayPh * 0.83) * swayH * uSway.x * 0.6;
`;

/**
 * @param material   material yang akan diberi goyangan
 * @param strength   besar simpangan
 * @param speed      kecepatan goyang
 * @param heightScale pengali ketinggian
 * @param base       ketinggian lokal mulai bergoyang (mis. puncak batang pohon)
 */
export function addSway(material, { strength = 0.1, speed = 1.6, heightScale = 0.3, base = 0 } = {}) {
  const sway = new THREE.Vector4(strength, speed, heightScale, base);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFoliageTime = foliageTime;
    shader.uniforms.uSway = { value: sway };
    shader.vertexShader = 'uniform float uFoliageTime;\nuniform vec4 uSway;\n'
      + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${SWAY_GLSL}`);
  };
  material.customProgramCacheKey = () => `sway-${strength}-${speed}-${heightScale}-${base}`;
  return material;
}

/** Material depth untuk bayangan yang ikut bergoyang. */
export function makeSwayDepthMaterial(opts) {
  return addSway(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), opts);
}
