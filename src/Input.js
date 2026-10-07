import { CONFIG } from './config.js';

/**
 * Keyboard + mouse.
 * Mode mouse 'auto': klik canvas meminta pointer lock. Selama kursor tidak terkunci
 * (pointer lock gagal / ditolak browser), menahan klik kiri lalu menggeser tetap memutar kamera.
 * Mode 'drag': pointer lock tidak pernah diminta, kamera selalu diputar dengan drag.
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();     // tombol yang baru ditekan pada frame ini
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.dragging = false;
    this.mouseMode = 'auto';
    this.enabled = false;         // hanya menerima input gerak saat game berjalan

    // Callback yang diisi main.js
    this.onLockChange = (_locked) => {};
    this.onLockError = () => {};
    this.onEscape = () => {};

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { this.onEscape(); return; }
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.dragging = false; });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      if (!this.locked && this.mouseMode === 'auto') this.requestLock();
      this.dragging = true;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.dragging) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => this.onLockChange(this.locked));
    document.addEventListener('pointerlockerror', () => this.onLockError());
  }

  get locked() { return document.pointerLockElement === this.canvas; }

  requestLock() {
    if (this.mouseMode !== 'auto' || this.locked || !this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock();
      // Browser baru mengembalikan Promise; browser lama memakai event pointerlockerror
      if (p && typeof p.catch === 'function') p.catch(() => this.onLockError());
    } catch {
      this.onLockError();
    }
  }

  releaseLock() {
    if (this.locked) document.exitPointerLock();
  }

  isDown(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }

  // Delta rotasi kamera (radian) sejak frame lalu
  consumeLook() {
    const s = this.locked ? CONFIG.camera.sensitivity : CONFIG.camera.dragSensitivity;
    const out = { dx: this.mouseDX * s, dy: this.mouseDY * s };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }

  // Ringkasan input gerak untuk Player
  moveState() {
    return {
      forward: (this.isDown('KeyW') ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0),
      right: (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0),
      run: this.isDown('ShiftLeft') || this.isDown('ShiftRight'),
      jump: this.wasPressed('Space'),
    };
  }

  endFrame() { this.pressed.clear(); }

  setEnabled(on) {
    this.enabled = on;
    if (!on) { this.keys.clear(); this.pressed.clear(); this.dragging = false; this.mouseDX = this.mouseDY = 0; }
  }
}
