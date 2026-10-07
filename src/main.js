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
import { Save } from './Save.js';
import { PostFX } from './PostFX.js';
import { findInteractable } from './Interactable.js';
import { applyHazardDamage, fallDamageFor } from './hazards/Hazard.js';
import { FallingTree } from './hazards/FallingTree.js';
import { FragileBridge } from './hazards/FragileBridge.js';
import { RiverZone } from './hazards/RiverZone.js';
import { FallingRocks } from './hazards/FallingRocks.js';
import { RIVER, HAZARD_LAYOUT, CHECKPOINTS, buildLevel, objectiveText } from './Level.js';

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
world.addVegetation(collision);
const postfx = new PostFX(renderer, scene, camera);

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

const settings = Save.loadSettings();
input.mouseMode = settings.mouseMode;
postfx.setBloom(settings.bloom);
hud.setBloom(settings.bloom);

// Konteks bersama untuk hazard dan level
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
const level = buildLevel(ctx);

// Mendarat dari ketinggian merusak paket sebanding kecepatan jatuh
player.onLand = (speed) => {
  const dmg = fallDamageFor(speed);
  if (dmg > 0) {
    applyHazardDamage(ctx, { package: dmg }, 'Jatuh');
    hud.toast('Paket terbentur saat mendarat!', 1.6);
  }
};

// ---------- Progres (disimpan di localStorage) ----------
function freshProgress() {
  const cp = CHECKPOINTS[0];
  return { village: 0, checkpoint: { ...cp.spawn }, packageHealth: CONFIG.package.maxHealth, flags: {}, elapsed: 0 };
}
let progress = freshProgress();
let elapsed = 0; // waktu tempuh berjalan (detik), termasuk percobaan ulang

function persist() {
  progress.elapsed = elapsed;
  Save.write(progress);
}

function refreshObjective() { hud.setObjective(objectiveText(progress)); }

// Objek yang diterima interactable (tuas, kunci, kode, penerima)
const game = {
  hud,
  get progress() { return progress; },
  setFlag(name) {
    progress.flags[name] = true;
    persist(); // status puzzle langsung disimpan supaya tidak perlu diulang
    refreshObjective();
  },
  openKeypad(code, onSuccess) {
    setMode('keypad');
    hud.openKeypad(
      (digits) => {
        const ok = digits.every((d, i) => d === code[i]);
        if (ok) onSuccess();
        return ok;
      },
      () => { if (mode === 'keypad') resume(); },
    );
  },
  deliver() { win(); },
};

function reachCheckpoint(cp) {
  progress.village = cp.village;
  progress.checkpoint = { ...cp.spawn };
  progress.packageHealth = pkg.health.current;
  persist();
  cp.setActive(true);
  hud.toast(`Checkpoint ${cp.name} — progres tersimpan`, 2.5);
  refreshObjective();
}

// ---------- State game: 'menu' | 'playing' | 'paused' | 'keypad' | 'lost' | 'won' ----------
let mode = 'menu';
let pausedAt = 0;
let pendingLoss = null; // diisi saat health habis, diproses di akhir langkah

playerHealth.onDeath(() => { pendingLoss ??= { title: 'Kurir tumbang!', reason: 'Health kurir habis. Hati-hati dengan hazard di jalur.' }; });
pkg.health.onDeath(() => { pendingLoss ??= { title: 'Paket hancur!', reason: 'Health paket habis. Hindari benturan, jatuh, dan air.' }; });

/** Kembali ke checkpoint terakhir dengan nilai yang tersimpan. */
function respawn() {
  for (const h of hazards) h.reset();
  level.applyProgress(progress);
  playerHealth.reset();
  pkg.health.reset(progress.packageHealth);
  const cp = progress.checkpoint;
  player.teleport(cp.x, world.terrain.heightAt(cp.x, cp.z), cp.z, cp.yaw);
  chase.snap(player.position, cp.yaw);
  chase.pitch = CONFIG.camera.initialPitchDeg * Math.PI / 180;
  pendingLoss = null;
  refreshObjective();
}

function setMode(next) {
  mode = next;
  input.setEnabled(next === 'playing');
  const screens = { menu: 'start', paused: 'pause', playing: null };
  if (next in screens) hud.showScreen(screens[next]);
  if (next !== 'playing') input.releaseLock();
  if (next === 'menu') refreshContinue();
  refreshClickHint();
}

function refreshClickHint() {
  hud.setClickHint(mode === 'playing' && input.mouseMode === 'auto' && !input.locked);
}

function refreshContinue() {
  const save = Save.load();
  hud.setContinue(save ? `Checkpoint: ${CHECKPOINTS[save.village]?.name ?? '-'}` : null);
}

function play() {
  setMode('playing');
  input.requestLock();
}

function newGame() {
  Save.clear();
  progress = freshProgress();
  elapsed = 0;
  respawn();
  persist();
  level.checkpoints[0].setActive(true);
  play();
}

function continueGame() {
  const save = Save.load();
  if (!save) { newGame(); return; }
  progress = { ...freshProgress(), ...save, flags: { ...save.flags } };
  elapsed = save.elapsed || 0;
  respawn();
  play();
}

function pause() {
  if (mode !== 'playing') return;
  pausedAt = performance.now();
  persist();
  setMode('paused');
}

function resume() { play(); }

function lose(info) {
  persist();
  setMode('lost');
  hud.showLost(info.title, info.reason);
}

function win() {
  setMode('won');
  hud.showWon(pkg.health.current, elapsed);
  Save.clear(); // permainan selesai; Lanjutkan tidak lagi ditawarkan
}

hud.onStart = newGame;
hud.onContinue = continueGame;
hud.onResume = resume;
hud.onToMenu = () => { if (mode === 'paused') persist(); setMode('menu'); };
hud.onRetry = () => { respawn(); play(); };
hud.onPlayAgain = newGame;
hud.onToggleMouseMode = () => {
  input.mouseMode = input.mouseMode === 'auto' ? 'drag' : 'auto';
  settings.mouseMode = input.mouseMode;
  Save.writeSettings(settings);
  hud.setMouseMode(input.mouseMode);
hud.onToggleBloom = () => {
  settings.bloom = !settings.bloom;
  Save.writeSettings(settings);
  postfx.setBloom(settings.bloom);
  hud.setBloom(settings.bloom);
};
};
hud.setMouseMode(input.mouseMode);
hud.onToggleBloom = () => {
  settings.bloom = !settings.bloom;
  Save.writeSettings(settings);
  postfx.setBloom(settings.bloom);
  hud.setBloom(settings.bloom);
};

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
  else if (mode === 'keypad') hud.closeKeypad();
  // Abaikan Esc yang datang bersamaan dengan lepasnya pointer lock
  else if (mode === 'paused' && performance.now() - pausedAt > 300) resume();
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize(window.innerWidth, window.innerHeight);
});
// Simpan waktu tempuh bila tab ditutup di tengah permainan
window.addEventListener('beforeunload', () => { if (mode !== 'menu' && mode !== 'won') persist(); });

// Akses konsol untuk playtest, hanya dengan ?debug
if (hud.debug) window.__game = { player, playerHealth, pkg, hazards, level, chase, world, collision, CONFIG, ctx, game, Save };

// ---------- Game loop dengan delta time ----------
let interactTarget = null;

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

    // Checkpoint: hanya desa yang lebih jauh dari progres sekarang yang menyimpan
    for (const cp of level.checkpoints) {
      if (cp.village > progress.village && cp.contains(player.position) && !pendingLoss) reachCheckpoint(cp);
    }

    // Interaksi E
    interactTarget = findInteractable(level.interactables, player.position, game);
    hud.setPrompt(interactTarget ? interactTarget.getPrompt(game) : null);
    const pressedE = input.wasPressed('KeyE');
    input.endFrame();
    if (pressedE && interactTarget && !pendingLoss) interactTarget.interact(game);

    if (pendingLoss && mode === 'playing') lose(pendingLoss);
  } else if (mode === 'menu') {
    chase.yaw += dt * 0.08; // kamera berputar pelan di menu utama
  }

  level.update(dt);
  pkg.update(dt);
  chase.update(dt, player.position);
  world.update(dt, player.position, camera);
  hud.update(dt);
  if (!debugNoRender) postfx.render();
}
let debugNoRender = false; // hanya diubah dari konsol debug untuk simulasi cepat

respawn();
setMode('menu');

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, CONFIG.sim.maxDelta);
  last = now;
  tick(dt);
}
requestAnimationFrame(frame);
if (hud.debug) Object.assign(window.__game, { tick, getMode: () => mode, getProgress: () => progress, setNoRender: (v) => { debugNoRender = v; } });
