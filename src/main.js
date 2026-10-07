import * as THREE from 'three';
import { CONFIG } from './config.js';
import { World } from './World.js';
import { Collision } from './Collision.js';
import { Player } from './Player.js';
import { ChaseCamera } from './ChaseCamera.js';
import { Input } from './Input.js';
import { Hud } from './Hud.js';
import { Health } from './Health.js';
import { Package } from './Package.js';
import { applyHazardDamage, fallDamageFor } from './hazards/Hazard.js';
import { FallingTree } from './hazards/FallingTree.js';
import { FragileBridge } from './hazards/FragileBridge.js';
import { RiverZone } from './hazards/RiverZone.js';
import { FallingRocks } from './hazards/FallingRocks.js';
import { SPAWN, RIVER, HAZARD_LAYOUT, TEMP_GOAL, buildTestProps } from './Level.js';

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
const playerHealth = new Health(CONFIG.health.playerMax);

const pkg = new Package();
pkg.attachTo(player.carrySocket);

const chase = new ChaseCamera(camera, world.terrain);
const input = new Input(canvas);
const hud = new Hud();
hud.bindHealth('bar-player', playerHealth);
hud.bindHealth('bar-package', pkg.health);

// Konteks bersama untuk semua hazard
const ctx = {
  scene, collision, terrain: world.terrain, player, pkg, playerHealth, hud,
  onHazardDamage(dealt, _source) {
    if (dealt.player > 0) hud.flashDamage('player');
    else if (dealt.package > 0) hud.flashDamage('package');
  },
};
const hazards = [
  new FallingTree(ctx, HAZARD_LAYOUT.fallingTree),
  new FragileBridge(ctx, HAZARD_LAYOUT.fragileBridge),
  new RiverZone(ctx, RIVER, HAZARD_LAYOUT.river),
  new FallingRocks(ctx, HAZARD_LAYOUT.fallingRocks),
];

// Mendarat dari ketinggian merusak paket sebanding kecepatan jatuh
player.onLand = (speed) => {
  const dmg = fallDamageFor(speed);
  if (dmg > 0) {
    applyHazardDamage(ctx, { package: dmg }, 'Jatuh');
    hud.toast('Paket terbentur saat mendarat!', 1.6);
  }
};

// ---------- State game: 'menu' | 'playing' | 'paused' | 'lost' | 'won' ----------
let mode = 'menu';
let pausedAt = 0;
let elapsed = 0;          // waktu tempuh (detik), termasuk percobaan ulang
let pendingLoss = null;   // diisi saat health habis, diproses di akhir frame

playerHealth.onDeath(() => { pendingLoss ??= { title: 'Kurir tumbang!', reason: 'Health kurir habis. Hati-hati dengan hazard di jalur.' }; });
pkg.health.onDeath(() => { pendingLoss ??= { title: 'Paket hancur!', reason: 'Health paket habis. Hindari benturan, jatuh, dan air.' }; });

// Titik respawn. Fase 3: diganti checkpoint desa terakhir dari localStorage.
const respawnPoint = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, packageHealth: CONFIG.package.maxHealth };

function respawn() {
  for (const h of hazards) h.reset();
  playerHealth.reset();
  pkg.health.reset(respawnPoint.packageHealth);
  const y = world.terrain.heightAt(respawnPoint.x, respawnPoint.z);
  player.teleport(respawnPoint.x, y, respawnPoint.z, respawnPoint.yaw);
  chase.snap(player.position, respawnPoint.yaw);
  pendingLoss = null;
}

function setMode(next) {
  mode = next;
  input.setEnabled(next === 'playing');
  const screens = { menu: 'start', paused: 'pause', lost: 'lost', won: 'won', playing: null };
  if (next !== 'lost' && next !== 'won') hud.showScreen(screens[next]);
  if (next !== 'playing') input.releaseLock();
  refreshClickHint();
}

function refreshClickHint() {
  hud.setClickHint(mode === 'playing' && input.mouseMode === 'auto' && !input.locked);
}

function startGame() {
  elapsed = 0;
  Object.assign(respawnPoint, { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, packageHealth: CONFIG.package.maxHealth });
  respawn();
  hud.setObjective('Antar paket ke Kaki Bukit di utara. Jaga paket tetap utuh!');
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

function lose(info) {
  setMode('lost');
  hud.showLost(info.title, info.reason);
}

function win() {
  setMode('won');
  hud.showWon(pkg.health.current, elapsed);
}

hud.onStart = startGame;
hud.onResume = resume;
hud.onToMenu = () => setMode('menu');
hud.onRetry = () => { respawn(); setMode('playing'); input.requestLock(); };
hud.onPlayAgain = startGame;
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
if (hud.debug) window.__game = { player, playerHealth, pkg, hazards, chase, world, collision, CONFIG, ctx };

// ---------- Game loop dengan delta time ----------
respawn();
setMode('menu');

// Satu langkah simulasi + render
function tick(dt) {
  if (mode === 'playing') {
    elapsed += dt;
    const look = input.consumeLook();
    chase.rotate(look.dx, look.dy, 1);
    const move = input.moveState();
    // Substep supaya controller stabil walau FPS turun
    const steps = Math.max(1, Math.ceil(dt / CONFIG.sim.maxSubstep));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) player.update(h, move, chase.yaw, i === 0 && move.jump);
    player.updateVisual(dt);
    player.mesh.updateMatrixWorld(true); // posisi paket terkini untuk cek tabrakan
    for (const hz of hazards) hz.update(dt);
    input.endFrame();

    if (pendingLoss) lose(pendingLoss);
    else if (Math.hypot(player.position.x - TEMP_GOAL.x, player.position.z - TEMP_GOAL.z) < TEMP_GOAL.r) win();
  } else if (mode === 'menu') {
    chase.yaw += dt * 0.08; // kamera berputar pelan di menu utama
  }

  pkg.update(dt);
  chase.update(dt, player.position);
  world.update(dt, player.position);
  hud.update(dt);
  renderer.render(scene, camera);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, CONFIG.sim.maxDelta);
  last = now;
  tick(dt);
}
requestAnimationFrame(frame);
if (hud.debug) Object.assign(window.__game, { tick, getMode: () => mode });
