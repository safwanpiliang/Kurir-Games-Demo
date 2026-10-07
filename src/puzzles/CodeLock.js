import { Interactable } from '../Interactable.js';

/** Puzzle desa 3: gembok kode tiga digit pada pagar rumah penerima. */
export class CodeLock extends Interactable {
  constructor({ gate, code }) {
    super({ x: gate.x, z: gate.z + 1.2, radius: 2.8, prompt: 'Masukkan kode gembok' });
    this.gate = gate;
    this.code = code;
  }

  canInteract() { return !this.gate.isOpen; }

  interact(game) {
    game.openKeypad(this.code, () => {
      this.gate.setOpen(true);
      game.setFlag('codeOpen');
      game.hud.toast('Klik! Gembok terbuka.', 2);
    });
  }
}
