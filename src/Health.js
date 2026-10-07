/**
 * Health generik, dipakai bersama oleh kurir dan paket.
 * Padanan di Unreal: BPC_Health (ModifyHealth, onDeath).
 */
export class Health {
  constructor(max = 100) {
    this.max = max;
    this.current = max;
    this.dead = false;
    this._change = new Set();
    this._death = new Set();
  }

  get ratio() { return this.current / this.max; }

  /** Kurangi health. Mengembalikan jumlah damage yang benar-benar diterima. */
  takeDamage(amount, source = 'unknown') {
    if (this.dead || amount <= 0) return 0;
    const dealt = Math.min(this.current, amount);
    this.current -= dealt;
    for (const fn of this._change) fn(this.current, -dealt, source);
    if (this.current <= 0) {
      this.dead = true;
      for (const fn of this._death) fn(source);
    }
    return dealt;
  }

  heal(amount) {
    if (this.dead || amount <= 0) return 0;
    const healed = Math.min(this.max - this.current, amount);
    this.current += healed;
    if (healed > 0) for (const fn of this._change) fn(this.current, healed, 'heal');
    return healed;
  }

  /** Pulihkan (mis. saat respawn) ke nilai tertentu tanpa memicu onDeath. */
  reset(value = this.max) {
    this.current = Math.max(0, Math.min(this.max, value));
    this.dead = this.current <= 0;
    for (const fn of this._change) fn(this.current, 0, 'reset');
  }

  /** Daftar listener; mengembalikan fungsi untuk berhenti mendengar. */
  onChange(fn) { this._change.add(fn); return () => this._change.delete(fn); }
  onDeath(fn) { this._death.add(fn); return () => this._death.delete(fn); }
}
