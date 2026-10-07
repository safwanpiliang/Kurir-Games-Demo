// Baca/tulis progres dan pengaturan ke localStorage.
// Semua akses dibungkus try/catch: mode privat atau storage penuh tidak boleh membuat game crash.

const SAVE_KEY = 'kurirNusantara.save.v1';
const SETTINGS_KEY = 'kurirNusantara.settings.v1';

/**
 * Bentuk data progres:
 * {
 *   village: 0..2,                       // checkpoint desa terakhir
 *   checkpoint: { x, z, yaw },           // posisi respawn
 *   packageHealth: number,               // health paket saat tiba di checkpoint
 *   flags: { leverPulled, keyTaken, gate2Open, codeOpen },
 *   elapsed: number                      // waktu tempuh (detik)
 * }
 */
export const Save = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data.village === 'number' ? data : null;
    } catch {
      return null;
    }
  },

  write(progress) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...progress, savedAt: Date.now() }));
      return true;
    } catch {
      return false;
    }
  },

  clear() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* abaikan */ }
  },

  loadSettings() {
    try {
      return { mouseMode: 'auto', bloom: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return { mouseMode: 'auto', bloom: true };
    }
  },

  writeSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* abaikan */ }
  },
};
