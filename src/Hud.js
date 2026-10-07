import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);

/**
 * HUD dan menu (HTML/CSS di atas canvas). Hanya mengurus tampilan;
 * aksi tombol diteruskan lewat callback yang diisi main.js.
 */
export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'),
      clickHint: $('click-hint'),
      toast: $('toast'),
      fps: $('fps'),
      vignette: $('vignette'),
      objective: $('objective-text'),
      prompt: $('prompt'),
      promptText: $('prompt-text'),
      btnMouseMode: $('btn-mouse-mode'),
      screens: {
        start: $('menu-start'),
        pause: $('menu-pause'),
        lost: $('menu-lost'),
        won: $('menu-won'),
      },
    };
    this.onStart = () => {};
    this.onResume = () => {};
    this.onToggleMouseMode = () => {};
    this.onToMenu = () => {};
    this.onRetry = () => {};
    this.onPlayAgain = () => {};

    $('btn-start').addEventListener('click', () => this.onStart());
    $('btn-resume').addEventListener('click', () => this.onResume());
    this.el.btnMouseMode.addEventListener('click', () => this.onToggleMouseMode());
    $('btn-to-menu').addEventListener('click', () => this.onToMenu());
    $('btn-retry').addEventListener('click', () => this.onRetry());
    $('btn-lost-menu').addEventListener('click', () => this.onToMenu());
    $('btn-play-again').addEventListener('click', () => this.onPlayAgain());
    $('btn-won-menu').addEventListener('click', () => this.onToMenu());

    this._toastTimer = 0;
    this._vignetteTimer = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
    this.debug = new URLSearchParams(location.search).has('debug');
    this.el.fps.classList.toggle('hidden', !this.debug);
  }

  // screen: 'start' | 'pause' | 'lost' | 'won' | null (sedang bermain)
  showScreen(screen) {
    for (const [name, el] of Object.entries(this.el.screens)) el.classList.toggle('hidden', name !== screen);
    this.el.hud.classList.toggle('hidden', screen === 'start');
    if (screen) this.setPrompt(null);
  }

  /** Hubungkan satu bar ke objek Health. rowId: 'bar-player' | 'bar-package' */
  bindHealth(rowId, health) {
    const row = $(rowId);
    const fill = row.querySelector('.bar-fill');
    const ghost = row.querySelector('.bar-ghost');
    const value = row.querySelector('.bar-value');
    const delta = row.querySelector('.bar-delta');
    let deltaTimer = null;
    const render = (cur, change) => {
      const pct = `${(cur / health.max) * 100}%`;
      fill.style.width = pct;
      // Bayangan putih tertinggal sebentar saat health turun, langsung ikut saat naik/reset
      if (change < 0) ghost.style.width = pct;
      else { ghost.style.transition = 'none'; ghost.style.width = pct; void ghost.offsetWidth; ghost.style.transition = ''; }
      value.textContent = Math.ceil(cur);
      row.classList.toggle('critical', rowId === 'bar-package' && cur / health.max <= CONFIG.package.criticalRatio);
      if (change < 0) {
        delta.textContent = `-${Math.round(-change)}`;
        delta.classList.add('show');
        clearTimeout(deltaTimer);
        deltaTimer = setTimeout(() => delta.classList.remove('show'), 700);
        row.classList.remove('hit');
        void row.offsetWidth; // ulang animasi goyang
        row.classList.add('hit');
      }
    };
    health.onChange((cur, change) => render(cur, change));
    render(health.current, 0);
  }

  /** Kilatan tepi layar: merah untuk kurir, keemasan untuk paket. */
  flashDamage(kind) {
    this.el.vignette.classList.toggle('package', kind === 'package');
    this.el.vignette.classList.add('show');
    this._vignetteTimer = 0.15;
  }

  setObjective(text) { this.el.objective.textContent = text; }

  /** Petunjuk tombol E; null untuk menyembunyikan. */
  setPrompt(text) {
    this.el.prompt.classList.toggle('hidden', !text);
    if (text) this.el.promptText.textContent = text;
  }

  showLost(title, reason) {
    $('lost-title').textContent = title;
    $('lost-reason').textContent = reason;
    this.showScreen('lost');
  }

  showWon(packageHealth, seconds) {
    $('won-package').textContent = `${Math.ceil(packageHealth)} / ${CONFIG.package.maxHealth}`;
    $('won-time').textContent = formatTime(seconds);
    this.showScreen('won');
  }

  setMouseMode(mode) {
    this.el.btnMouseMode.textContent = `Kontrol mouse: ${mode === 'auto' ? 'Otomatis (pointer lock)' : 'Drag'}`;
  }

  setClickHint(visible) {
    this.el.clickHint.classList.toggle('hidden', !visible);
  }

  toast(text, seconds = 2.5) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this._toastTimer = seconds;
  }

  update(dt) {
    if (this._toastTimer > 0) {
      this._toastTimer -= dt;
      if (this._toastTimer <= 0) this.el.toast.classList.remove('show');
    }
    if (this._vignetteTimer > 0) {
      this._vignetteTimer -= dt;
      if (this._vignetteTimer <= 0) this.el.vignette.classList.remove('show');
    }
    if (this.debug) {
      this._fpsFrames++;
      this._fpsTime += dt;
      if (this._fpsTime >= 0.5) {
        this.el.fps.textContent = `${Math.round(this._fpsFrames / this._fpsTime)} FPS`;
        this._fpsFrames = 0;
        this._fpsTime = 0;
      }
    }
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
