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
      menuStart: $('menu-start'),
      menuPause: $('menu-pause'),
      btnMouseMode: $('btn-mouse-mode'),
    };
    this.onStart = () => {};
    this.onResume = () => {};
    this.onToggleMouseMode = () => {};
    this.onToMenu = () => {};

    $('btn-start').addEventListener('click', () => this.onStart());
    $('btn-resume').addEventListener('click', () => this.onResume());
    this.el.btnMouseMode.addEventListener('click', () => this.onToggleMouseMode());
    $('btn-to-menu').addEventListener('click', () => this.onToMenu());

    this._toastTimer = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
    this.debug = new URLSearchParams(location.search).has('debug');
    this.el.fps.classList.toggle('hidden', !this.debug);
  }

  // screen: 'start' | 'pause' | null (sedang bermain)
  showScreen(screen) {
    this.el.menuStart.classList.toggle('hidden', screen !== 'start');
    this.el.menuPause.classList.toggle('hidden', screen !== 'pause');
    this.el.hud.classList.toggle('hidden', screen === 'start');
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
