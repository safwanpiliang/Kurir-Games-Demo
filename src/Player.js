import * as THREE from 'three';
import { CONFIG } from './config.js';

const DEG = Math.PI / 180;
const _grad = { x: 0, z: 0 };

function flatMat(color) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
}

/**
 * Kurir: character controller kinematik (kecepatan, gravitasi, raycast pijakan)
 * dan model placeholder dari bentuk primitif dengan animasi jalan/lari prosedural.
 */
export class Player {
  constructor(collision) {
    this.collision = collision;
    this.terrain = collision.terrain;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.facing = 0;            // yaw badan
    this.grounded = false;
    this.onTerrain = true;
    this.groundObject = null;   // mesh walkable yang sedang diinjak (null = terrain)
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.speedMultiplier = 1;
    this.fallStartY = 0;
    this.animPhase = 0;

    // Dipanggil saat mendarat: (kecepatanJatuh m/s, tinggiJatuh m)
    this.onLand = (_speed, _height) => {};

    this.mesh = this.#buildModel();
  }

  #buildModel() {
    const root = new THREE.Group();
    root.name = 'kurir';
    const body = new THREE.Group(); // diayun saat berjalan
    root.add(body);

    const shirt = flatMat('#2a9d8f');
    const pants = flatMat('#3d405b');
    const skin = flatMat('#d9a066');
    const hat = flatMat('#e9c46a');

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.45, 3, 8), shirt);
    torso.position.y = 1.05;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), skin);
    head.position.y = 1.55;
    body.add(head);

    // Caping (topi kerucut)
    const caping = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.18, 8), hat);
    caping.position.y = 1.72;
    body.add(caping);

    // Kaki dan lengan berporos di pangkal supaya bisa diayun
    const makeLimb = (w, h, mat, x, y) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      m.position.y = -h / 2;
      pivot.add(m);
      body.add(pivot);
      return pivot;
    };
    this.legL = makeLimb(0.16, 0.7, pants, -0.13, 0.72);
    this.legR = makeLimb(0.16, 0.7, pants, 0.13, 0.72);
    this.armL = makeLimb(0.12, 0.55, shirt, -0.38, 1.3);
    this.armR = makeLimb(0.12, 0.55, shirt, 0.38, 1.3);

    // Titik pegangan paket (dipakai Package.js di fase 2), di depan dada
    this.carrySocket = new THREE.Object3D();
    this.carrySocket.position.set(0, 1.05, -0.42);
    body.add(this.carrySocket);

    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.body = body;
    return root;
  }

  teleport(x, y, z, yaw = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.facing = yaw;
    this.grounded = true;
    this.fallStartY = y;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = yaw;
  }

  /**
   * @param move {forward, right, run, jump}
   * @param cameraYaw arah kamera, supaya WASD relatif terhadap kamera
   * @param jumpPressed true pada substep pertama frame saat Space ditekan
   */
  update(dt, move, cameraYaw, jumpPressed) {
    const C = CONFIG.player;
    const v = this.velocity;

    // Arah yang diinginkan, relatif kamera
    const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);
    const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
    let wx = fx * move.forward + rx * move.right;
    let wz = fz * move.forward + rz * move.right;
    const wl = Math.hypot(wx, wz);
    if (wl > 1e-4) { wx /= wl; wz /= wl; }
    const speed = (move.run ? C.runSpeed : C.walkSpeed) * this.speedMultiplier * (wl > 1e-4 ? 1 : 0);

    const accel = this.grounded ? C.acceleration : C.acceleration * C.airControl;
    const k = 1 - Math.exp(-accel * dt);
    v.x += (wx * speed - v.x) * k;
    v.z += (wz * speed - v.z) * k;

    // Lompat dengan coyote time dan jump buffer agar terasa responsif
    if (jumpPressed) this.jumpBuffer = C.jumpBuffer;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.grounded ? C.coyoteTime : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      v.y = C.jumpVelocity;
      this.grounded = false;
      this.fallStartY = this.position.y;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }

    // Meluncur turun di lereng yang terlalu curam
    const tanMax = Math.tan(C.maxSlopeDeg * DEG);
    if (this.grounded && this.onTerrain) {
      this.terrain.gradientAt(this.position.x, this.position.z, _grad);
      const s = Math.hypot(_grad.x, _grad.z);
      if (s > tanMax) {
        v.x -= (_grad.x / s) * C.slideAccel * dt;
        v.z -= (_grad.z / s) * C.slideAccel * dt;
      }
    }

    v.y = Math.max(-C.maxFallSpeed, v.y - C.gravity * dt);

    // Gerak horizontal: coba penuh, lalu per sumbu (meluncur di sepanjang lereng)
    const dx = v.x * dt, dz = v.z * dt;
    const p = this.position;
    if (this.#canMove(p.x + dx, p.z + dz, dx, dz, tanMax)) { p.x += dx; p.z += dz; }
    else if (this.#canMove(p.x + dx, p.z, dx, 0, tanMax)) { p.x += dx; v.z = 0; }
    else if (this.#canMove(p.x, p.z + dz, 0, dz, tanMax)) { p.z += dz; v.x = 0; }
    else { v.x = 0; v.z = 0; }

    this.collision.resolve(p, C.radius, C.height, C.stepHeight);

    const lim = CONFIG.world.size / 2 - CONFIG.world.boundsMargin;
    p.x = Math.max(-lim, Math.min(lim, p.x));
    p.z = Math.max(-lim, Math.min(lim, p.z));

    // Gerak vertikal + pijakan
    const wasGrounded = this.grounded;
    const ground = this.collision.groundAt(p.x, p.z, p.y + C.stepHeight);
    const newY = p.y + v.y * dt;
    if (newY <= ground.height) {
      if (!wasGrounded) this.onLand(-v.y, this.fallStartY - ground.height);
      p.y = ground.height;
      v.y = 0;
      this.grounded = true;
    } else if (wasGrounded && v.y <= 0 && p.y - ground.height <= C.snapDistance) {
      p.y = ground.height; // tempel saat menuruni lereng
      v.y = 0;
      this.grounded = true;
    } else {
      if (wasGrounded) this.fallStartY = p.y;
      p.y = newY;
      this.grounded = false;
    }
    if (!this.grounded) this.fallStartY = Math.max(this.fallStartY, p.y);
    this.onTerrain = ground.onTerrain;
    this.groundObject = this.grounded ? ground.object : null;
  }

  // Tolak gerak menanjak di lereng terrain yang terlalu curam
  #canMove(x, z, dx, dz, tanMax) {
    const th = this.terrain.heightAt(x, z);
    if (th < this.position.y - 0.1) return true; // masih di atas permukaan
    this.terrain.gradientAt(x, z, _grad);
    const s = Math.hypot(_grad.x, _grad.z);
    return !(s > tanMax && _grad.x * dx + _grad.z * dz > 0);
  }

  // Sinkronisasi model dan animasi; dipanggil sekali per frame
  updateVisual(dt) {
    const C = CONFIG.player;
    const hs = Math.hypot(this.velocity.x, this.velocity.z);
    if (hs > 0.3) {
      const target = Math.atan2(-this.velocity.x, -this.velocity.z);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * (1 - Math.exp(-C.turnSpeed * dt));
    }
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;

    // Ayunan kaki dan lengan sebanding kecepatan
    const t = Math.min(1, hs / C.runSpeed);
    if (this.grounded) this.animPhase += dt * (4 + hs * 1.4);
    const swing = this.grounded ? Math.sin(this.animPhase) * (0.2 + 0.7 * t) * Math.min(1, hs) : 0.5;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = this.grounded ? -swing : -0.3;
    this.armL.rotation.x = this.grounded ? -swing * 0.8 : -0.6;
    this.armR.rotation.x = this.grounded ? swing * 0.8 : -0.6;
    this.body.position.y = this.grounded ? Math.abs(Math.sin(this.animPhase)) * 0.06 * Math.min(1, hs) : 0;
    this.body.rotation.x = -t * 0.15; // condong ke depan saat berlari
  }
}
