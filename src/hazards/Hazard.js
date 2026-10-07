import { CONFIG } from '../config.js';

/**
 * Satu-satunya jalur damage dari hazard ke kurir dan paket
 * (padanan Blueprint Interface di Unreal). Semua hazard memanggil fungsi ini.
 *
 * @param ctx      { playerHealth, pkg, hud }
 * @param amounts  { player?: number, package?: number }
 * @param source   nama hazard, untuk HUD/log
 */
export function applyHazardDamage(ctx, amounts, source) {
  const dealt = { player: 0, package: 0 };
  if (amounts.player > 0) dealt.player = ctx.playerHealth.takeDamage(amounts.player, source);
  if (amounts.package > 0) dealt.package = ctx.pkg.health.takeDamage(amounts.package, source);
  ctx.onHazardDamage?.(dealt, source);
  return dealt;
}

/** Damage paket saat mendarat, sebanding kecepatan jatuh. */
export function fallDamageFor(impactSpeed) {
  const F = CONFIG.fallDamage;
  if (impactSpeed <= F.safeSpeed) return 0;
  return Math.round(Math.min(F.max, (impactSpeed - F.safeSpeed) * F.perSpeed));
}

/** Kelas dasar hazard. ctx berisi scene, collision, terrain, player, pkg, playerHealth, hud. */
export class Hazard {
  constructor(ctx) {
    this.ctx = ctx;
  }

  damage(amounts, source) { return applyHazardDamage(this.ctx, amounts, source); }

  update(_dt) {}

  /** Kembalikan ke keadaan awal (dipanggil saat respawn). */
  reset() {}
}
