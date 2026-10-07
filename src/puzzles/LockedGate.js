import { Interactable } from '../Interactable.js';

/**
 * Titik interaksi di depan gerbang. Bila syarat terpenuhi (mis. punya kunci), E membuka gerbang;
 * bila belum, E menampilkan petunjuk.
 */
export class LockedGate extends Interactable {
  constructor({ gate, flag, canOpen, openPrompt, lockedPrompt, lockedMessage, openMessage }) {
    super({ x: gate.x, z: gate.z + 1.2, radius: 2.8 });
    Object.assign(this, { gate, flag, canOpen, openPrompt, lockedPrompt, lockedMessage, openMessage });
  }

  canInteract() { return !this.gate.isOpen; }

  getPrompt(game) { return this.canOpen(game.progress.flags) ? this.openPrompt : this.lockedPrompt; }

  interact(game) {
    if (!this.canOpen(game.progress.flags)) {
      game.hud.toast(this.lockedMessage, 2.8);
      return;
    }
    this.gate.setOpen(true);
    game.setFlag(this.flag);
    game.hud.toast(this.openMessage, 2.2);
  }
}
