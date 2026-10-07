import { Interactable } from '../Interactable.js';
import { makePerson } from '../props.js';

/** Penerima paket di Kaki Bukit. Serah-terima = menang. */
export class Recipient extends Interactable {
  constructor(ctx, { x, z, name }) {
    super({ x, z, radius: 2.6, prompt: `Serahkan paket kepada ${name}` });
    this.name = name;
    this.time = 0;
    this.mesh = makePerson({ shirt: '#2a9d8f', skirt: '#8c3b2b' });
    this.mesh.position.set(x, ctx.terrain.heightAt(x, z), z);
    ctx.scene.add(this.mesh);
    ctx.collision.addCircle({ x, z, r: 0.4 });
  }

  interact(game) { game.deliver(); }

  update(dt) {
    // Bergoyang pelan supaya terlihat hidup
    this.time += dt;
    this.mesh.rotation.y = Math.sin(this.time * 0.8) * 0.15;
  }
}
