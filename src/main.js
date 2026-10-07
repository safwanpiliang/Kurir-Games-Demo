import * as THREE from 'three';
import { CONFIG } from './config.js';
import { World } from './World.js';
import { Collision } from './Collision.js';
import { Player } from './Player.js';
import { ChaseCamera } from './ChaseCamera.js';
import { Input } from './Input.js';
import { Hud } from './Hud.js';
import { SPAWN, buildTestProps } from './Level.js';

// ---------- Renderer, scene, kamera ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = CONFIG.render.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 600);

// ---------- Sistem game ----------
const world = new World(scene);
const collision = new Collision(world.terrain);
buildTestProps(scene, collision);

const player = new Player(collision);
scene.add(player.mesh);

const chase = new ChaseCamera(camera, world.terrain);
const input = new Input(canvas);
const hud = new Hud();

// ---------- State game: 'menu' | 'playing' | 'paused' ----------
let mode = 'menu';
let pausedAt = 0;

function spawnAtStart() {
  const y = world.terrain.heightAt(SPAWN.x, SPAWN.z);
  player.teleport(SPAWN.x, y, SPAWN.z, SPAWN.yaw);
  chase.snap(player.position, SPAWN.yaw);
}

function setMode(next) {
  mode = next;
  input.setEnabled(next === 'playing');
  hud.showScreen(next === 'menu' ? 'start' : next === 'paused' ? 'pause' : null);
  if (next !== 'playing') input.releaseLock();
  refreshClickHint();
}

function refreshClickHint() {
  const show = mode === 'playing' && input.mouseMode === 'auto' && !input.locked;
  hud.setClickHint(show);
}

function startGame() {
  spawnAtStart();
  setMode('playing');
  input.requestLock();
}

function pause() {
  if (mode !== 'playing') return;
  pausedAt = performance.now();
  setMode('paused');
}

function resume() {
  setMode('playing');
  input.requestLock();
}

hud.onStart = startGame;
hud.onResume = resume;
hud.onToMenu = () => setMode('menu');
hud.onToggleMouseMode = () => {
  input.mouseMode = input.mouseMode === 'auto' ? 'drag' : 'auto';
  hud.setMouseMode(input.mouseMode);
};
hud.setMouseMode(input.mouseMode);

input.onLockChange = (locked) => {
  // Browser melepas pointer lock saat Esc ditekan -> jeda
  if (!locked && mode === 'playing') pause();
  refreshClickHint();
};
input.onLockError = () => {
  if (mode !== 'playing') return;
  hud.toast('Pointer lock gagal. Tahan klik kiri lalu geser untuk memutar kamera.', 4);
  refreshClickHint();
};
input.onEscape = () => {
  if (mode === 'playing') pause();
  // Abaikan Esc yang datang bersamaan dengan lepasnya pointer lock
  else if (mode === 'paused' && performance.now() - pausedAt > 300) resume();
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Akses konsol untuk playtest, hanya dengan ?debug
if (hud.debug) window.__game = { player, chase, world, collision, CONFIG };

// ---------- Game loop dengan delta time ----------
spawnAtStart();
setMode('menu');

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, CONFIG.sim.maxDelta);
  last = now;

  if (mode === 'playing') {
    const look = input.consumeLook();
    chase.rotate(look.dx, look.dy, 1);
    const move = input.moveState();
    // Substep supaya controller stabil walau FPS turun
    const steps = Math.max(1, Math.ceil(dt / CONFIG.sim.maxSubstep));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) player.update(h, move, chase.yaw, i === 0 && move.jump);
    player.updateVisual(dt);
    input.endFrame();
  } else if (mode === 'menu') {
    chase.yaw += dt * 0.08; // kamera berputar pelan di menu utama
  }

  chase.update(dt, player.position);
  world.update(dt, player.position);
  hud.update(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
