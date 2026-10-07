import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Hazard } from './Hazard.js';

/**
 * Jembatan rapuh di atas jurang. Tiap papan bergetar lalu jatuh beberapa saat setelah diinjak.
 * Kurir yang ikut jatuh mendarat di dasar jurang; paket menerima benturan lewat fall damage
 * (lihat fallDamage di config.js). Ramp kayu di dasar jurang membawa kurir kembali ke tepi selatan.
 */
export class FragileBridge extends Hazard {
  constructor(ctx, layout) {
    super(ctx);
    const B = CONFIG.hazards.fragileBridge;
    this.layout = layout;
    const { x, zStart, zEnd, y } = layout;
    const dir = Math.sign(zEnd - zStart);
    const span = Math.abs(zEnd - zStart);
    const count = Math.round(span / B.plankLength);
    const len = span / count;

    const wood = new THREE.MeshStandardMaterial({ color: '#9c6b3f', flatShading: true, roughness: 0.9 });
    const woodDark = new THREE.MeshStandardMaterial({ color: '#6e4a2b', flatShading: true });
    const rope = new THREE.MeshStandardMaterial({ color: '#d8c08a', flatShading: true });

    this.planks = [];
    for (let i = 0; i < count; i++) {
      if (layout.missing.includes(i)) continue;
      // Papan sedikit berbeda ukuran/rotasi supaya terlihat buatan tangan
      const geo = new THREE.BoxGeometry(B.width * (0.92 + Math.random() * 0.08), 0.14, len * 0.9);
      const mesh = new THREE.Mesh(geo, i % 2 ? wood : woodDark);
      const home = new THREE.Vector3(x, y, zStart + dir * (i + 0.5) * len);
      mesh.castShadow = mesh.receiveShadow = true;
      ctx.scene.add(mesh);
      this.planks.push({ mesh, home, rotY: (Math.random() - 0.5) * 0.06, state: 'intact', timer: 0, vy: 0 });
    }

    // Tali dan tiang (visual) + pagar tak terlihat supaya kurir tidak terpeleset ke samping
    const zMid = (zStart + zEnd) / 2;
    for (const side of [-1, 1]) {
      const rx = x + side * (B.width / 2 + 0.1);
      const ropeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, span), rope);
      ropeMesh.position.set(rx, y + 0.9, zMid);
      ctx.scene.add(ropeMesh);
      for (const z of [zStart, zEnd]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 6), woodDark);
        post.position.set(rx, y + 0.1, z);
        post.castShadow = true;
        ctx.scene.add(post);
      }
      ctx.collision.addBox({ x: rx, z: zMid, hx: 0.08, hz: span / 2, yMin: y - 0.5, yMax: y + 1.2 });
    }

    this.#buildRamp(layout.ramp, wood);
    this.reset();
  }

  #buildRamp(ramp, mat) {
    const { ctx } = this;
    const bottomY = ctx.terrain.heightAt(ramp.bottom.x, ramp.bottom.z);
    const topY = this.layout.y - 0.1;
    const dx = ramp.top.x - ramp.bottom.x;
    const rise = topY - bottomY;
    const length = Math.hypot(dx, rise);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 3.2), mat);
    mesh.position.set((ramp.top.x + ramp.bottom.x) / 2, (topY + bottomY) / 2, ramp.bottom.z);
    // Ujung atas berada di x lebih kecil -> miring ke arah -x
    mesh.rotation.z = Math.atan2(rise, dx);
    // Pijakan datar di ujung atas yang menyambung ke tepi jurang
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4.4), mat);
    deck.position.set(ramp.top.x - 2, topY - 0.05, ramp.top.z + 1.4);
    for (const m of [mesh, deck]) {
      m.castShadow = m.receiveShadow = true;
      m.updateMatrixWorld();
      ctx.scene.add(m);
      ctx.collision.addWalkable(m);
    }
  }

  reset() {
    for (const p of this.planks) {
      p.state = 'intact';
      p.timer = 0;
      p.vy = 0;
      p.mesh.visible = true;
      p.mesh.position.copy(p.home);
      p.mesh.rotation.set(0, p.rotY, 0);
      p.mesh.updateMatrixWorld();
      if (!this.ctx.collision.walkables.includes(p.mesh)) this.ctx.collision.addWalkable(p.mesh);
    }
  }

  update(dt) {
    const B = CONFIG.hazards.fragileBridge;
    const standingOn = this.ctx.player.groundObject;
    for (const p of this.planks) {
      if (p.state === 'intact') {
        if (standingOn === p.mesh) { p.state = 'shaking'; p.timer = 0; }
      } else if (p.state === 'shaking') {
        p.timer += dt;
        const k = p.timer / B.fallDelay;
        p.mesh.position.set(
          p.home.x + (Math.random() - 0.5) * 0.06 * k,
          p.home.y - 0.04 * k,
          p.home.z + (Math.random() - 0.5) * 0.04 * k,
        );
        p.mesh.rotation.z = Math.sin(p.timer * 50) * 0.04 * k;
        p.mesh.updateMatrixWorld();
        if (p.timer >= B.fallDelay) {
          p.state = 'falling';
          p.timer = 0;
          this.ctx.collision.removeWalkable(p.mesh);
        }
      } else if (p.state === 'falling') {
        p.timer += dt;
        p.vy -= CONFIG.player.gravity * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.x += dt * 2;
        if (p.timer > 2.5) { p.state = 'gone'; p.mesh.visible = false; }
      } else if (p.state === 'gone') {
        p.timer += dt;
        if (p.timer >= B.respawnTime) {
          p.state = 'intact';
          p.vy = 0;
          p.mesh.visible = true;
          p.mesh.position.copy(p.home);
          p.mesh.rotation.set(0, p.rotY, 0);
          p.mesh.updateMatrixWorld();
          this.ctx.collision.addWalkable(p.mesh);
        }
      }
    }
  }
}
