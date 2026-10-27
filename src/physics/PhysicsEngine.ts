/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Biome, GameStats, PickupItem, StuntNotification, VehicleDef, VehicleUpgrades } from '../types/game';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { getUpgradeMultiplier } from '../config/gameData';

export interface VehiclePhysicsState {
  // Chassis
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;

  // Rear Wheel
  rearX: number;
  rearY: number;
  rearVx: number;
  rearVy: number;
  rearAngVel: number;
  rearGrounded: boolean;

  // Front Wheel
  frontX: number;
  frontY: number;
  frontVx: number;
  frontVy: number;
  frontAngVel: number;
  frontGrounded: boolean;

  // Driver
  headX: number;
  headY: number;

  // Stats & State
  fuel: number; // 0 - 100
  isDead: boolean;
  deathReason: 'CRASH' | 'FUEL_EMPTY' | 'NONE';
  throttleInput: number; // -1 (brake) to +1 (gas)
  airTime: number; // seconds in air
  accumulatedFlipAngle: number; // airborne rotation tracking
}

export class PhysicsEngine {
  public vehicle: VehicleDef;
  public upgrades: VehicleUpgrades;
  public biome: Biome;
  public terrain: TerrainGenerator;
  public state: VehiclePhysicsState;

  // Active stunts & notifications
  public activeNotifications: StuntNotification[] = [];
  private nextNotifId = 1;
  public coinsCollectedThisRun = 0;
  public stuntsCount = 0;
  public maxAirTime = 0;
  public onSoundTrigger?: (type: 'coin' | 'fuel' | 'landing' | 'crash' | 'stunt', value?: number) => void;

  constructor(vehicle: VehicleDef, upgrades: VehicleUpgrades, biome: Biome, terrain: TerrainGenerator) {
    this.vehicle = vehicle;
    this.upgrades = upgrades;
    this.biome = biome;
    this.terrain = terrain;
    this.state = this.createInitialState();
  }

  public reset(vehicle?: VehicleDef, upgrades?: VehicleUpgrades, biome?: Biome): void {
    if (vehicle) this.vehicle = vehicle;
    if (upgrades) this.upgrades = upgrades;
    if (biome) this.biome = biome;
    this.activeNotifications = [];
    this.coinsCollectedThisRun = 0;
    this.stuntsCount = 0;
    this.maxAirTime = 0;
    this.state = this.createInitialState();
  }

  private createInitialState(): VehiclePhysicsState {
    const startX = 60;
    const groundY = this.terrain.getGroundHeight(startX);
    const startY = groundY - 60;

    const rOffset = -this.vehicle.wheelDistance;
    const fOffset = this.vehicle.wheelDistance;
    const baseY = this.vehicle.wheelBaseY;

    return {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,

      rearX: startX + rOffset,
      rearY: startY + baseY,
      rearVx: 0,
      rearVy: 0,
      rearAngVel: 0,
      rearGrounded: false,

      frontX: startX + fOffset,
      frontY: startY + baseY,
      frontVx: 0,
      frontVy: 0,
      frontAngVel: 0,
      frontGrounded: false,

      headX: startX,
      headY: startY - this.vehicle.bodyHeight * 0.7,

      fuel: 100,
      isDead: false,
      deathReason: 'NONE',
      throttleInput: 0,
      airTime: 0,
      accumulatedFlipAngle: 0,
    };
  }

  /**
   * Main simulation step, executed with multiple sub-steps for bulletproof stability
   */
  public update(dt: number, throttle: number): void {
    if (this.state.isDead) return;

    this.state.throttleInput = Math.max(-1, Math.min(1, throttle));

    // Consume fuel
    this.updateFuel(dt);

    // Sub-stepping for 100% collision accuracy without tunneling
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.simulateSubStep(subDt);
      if (this.state.isDead) break;
    }

    // Update notifications decay
    this.updateNotifications(dt);
  }

  private updateFuel(dt: number): void {
    const tankMultiplier = getUpgradeMultiplier(this.upgrades.fuel, 0.12);
    // Base fuel burn + throttle burn
    const baseDrain = 0.85 / tankMultiplier;
    const throttleDrain = Math.abs(this.state.throttleInput) > 0.05 ? 1.6 / tankMultiplier : 0;
    const totalDrain = (baseDrain + throttleDrain) * dt;

    this.state.fuel = Math.max(0, this.state.fuel - totalDrain);

    if (this.state.fuel <= 0) {
      // Check if vehicle has ground-halted
      const speed = Math.hypot(this.state.vx, this.state.vy);
      if (speed < 0.8) {
        this.triggerDeath('FUEL_EMPTY');
      }
    }
  }

  private simulateSubStep(dt: number): void {
    const s = this.state;
    const v = this.vehicle;

    // Upgrades scaling
    const engineMult = getUpgradeMultiplier(this.upgrades.engine, 0.12);
    const tiresMult = getUpgradeMultiplier(this.upgrades.tires, 0.1);
    const suspMult = getUpgradeMultiplier(this.upgrades.suspension, 0.1);

    const gravityAccel = this.biome.gravity * 75; // scaled for responsive 2D physics

    // 1. Apply gravity to chassis and wheels
    s.vy += gravityAccel * dt;
    s.rearVy += gravityAccel * dt;
    s.frontVy += gravityAccel * dt;

    // 2. Air control (When both wheels off ground)
    const bothAirborne = !s.rearGrounded && !s.frontGrounded;

    if (bothAirborne) {
      s.airTime += dt;
      // Stunt flip tracking
      s.accumulatedFlipAngle += s.angularVelocity * dt;

      // Air pitch rotation control
      const airControlTorque = 4.8;
      if (s.throttleInput > 0) {
        // Gas tilts nose up / back
        s.angularVelocity -= airControlTorque * s.throttleInput * dt;
      } else if (s.throttleInput < 0) {
        // Brake tilts nose down / forward
        s.angularVelocity -= airControlTorque * s.throttleInput * dt; // s.throttleInput is negative
      }

      // Check full flips
      if (s.accumulatedFlipAngle <= -Math.PI * 1.85) {
        this.addNotification('شقلبة خلفية! (Backflip!)', 500);
        this.onSoundTrigger?.('stunt', 500);
        this.stuntsCount++;
        s.accumulatedFlipAngle += Math.PI * 2;
      } else if (s.accumulatedFlipAngle >= Math.PI * 1.85) {
        this.addNotification('شقلبة أمامية! (Frontflip!)', 500);
        this.onSoundTrigger?.('stunt', 500);
        this.stuntsCount++;
        s.accumulatedFlipAngle -= Math.PI * 2;
      }
    } else {
      // Landing occurred
      if (s.airTime > 1.2) {
        const bonus = Math.round(s.airTime * 150);
        this.addNotification(`طيران في الهواء! (${s.airTime.toFixed(1)} ث)`, bonus);
        this.onSoundTrigger?.('stunt', bonus);
        this.stuntsCount++;
      }
      this.maxAirTime = Math.max(this.maxAirTime, s.airTime);
      s.airTime = 0;
      s.accumulatedFlipAngle = 0;
    }

    // 3. Suspension Springs & Dampers
    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);

    // Chassis axle attachment points in world coordinates
    const rAnchorX = s.x - v.wheelDistance * cosA - v.wheelBaseY * -sinA;
    const rAnchorY = s.y - v.wheelDistance * sinA + v.wheelBaseY * cosA;

    const fAnchorX = s.x + v.wheelDistance * cosA - v.wheelBaseY * -sinA;
    const fAnchorY = s.y + v.wheelDistance * sinA + v.wheelBaseY * cosA;

    // Rear suspension spring force
    this.applySuspensionForce(
      rAnchorX,
      rAnchorY,
      s.rearX,
      s.rearY,
      s.vx,
      s.vy,
      s.rearVx,
      s.rearVy,
      -v.wheelDistance,
      v.wheelBaseY,
      v.springStiffness * suspMult,
      v.springDamping * Math.sqrt(suspMult),
      dt
    );

    // Front suspension spring force
    this.applySuspensionForce(
      fAnchorX,
      fAnchorY,
      s.frontX,
      s.frontY,
      s.vx,
      s.vy,
      s.frontVx,
      s.frontVy,
      v.wheelDistance,
      v.wheelBaseY,
      v.springStiffness * suspMult,
      v.springDamping * Math.sqrt(suspMult),
      dt
    );

    // 4. Ground Collision for Rear Wheel
    const wasRearGrounded = s.rearGrounded;
    s.rearGrounded = this.resolveWheelGround(s.rearX, s.rearY, s.rearVx, s.rearVy, s.rearAngVel, v.wheelRadius, (vx, vy, w) => {
      s.rearVx = vx;
      s.rearVy = vy;
      s.rearAngVel = w;
    }, dt, tiresMult, true, s.throttleInput, engineMult);

    // 5. Ground Collision for Front Wheel
    const wasFrontGrounded = s.frontGrounded;
    s.frontGrounded = this.resolveWheelGround(s.frontX, s.frontY, s.frontVx, s.frontVy, s.frontAngVel, v.wheelRadius, (vx, vy, w) => {
      s.frontVx = vx;
      s.frontVy = vy;
      s.frontAngVel = w;
    }, dt, tiresMult, v.allWheelDrive, s.throttleInput, engineMult);

    // Landing sound on touch
    if ((!wasRearGrounded && s.rearGrounded) || (!wasFrontGrounded && s.frontGrounded)) {
      const impactSpeed = Math.abs(s.vy);
      if (impactSpeed > 25) {
        this.onSoundTrigger?.('landing', Math.min(3, impactSpeed / 30));
      }
    }

    // 6. Air resistance and rotational damping
    s.angularVelocity *= 0.995;
    s.vx *= 0.9995;
    s.vy *= 0.9995;

    // 7. Integrate Positions
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.angle += s.angularVelocity * dt;

    s.rearX += s.rearVx * dt;
    s.rearY += s.rearVy * dt;

    s.frontX += s.frontVx * dt;
    s.frontY += s.frontVy * dt;

    // 8. Driver Head Position & Crash Detection
    const headUpOffset = v.bodyHeight * 0.75;
    s.headX = s.x - headUpOffset * -sinA;
    s.headY = s.y - headUpOffset * cosA;

    const groundAtHead = this.terrain.getGroundHeight(s.headX);
    const headRadius = 14;

    if (s.headY + headRadius >= groundAtHead) {
      // Driver head touched the terrain!
      // Invert angle check: is vehicle overturned?
      const normalizedAngle = Math.abs(Math.atan2(Math.sin(s.angle), Math.cos(s.angle)));
      if (normalizedAngle > 1.35) {
        // Vehicle is tilted more than ~78 degrees upside down
        this.triggerDeath('CRASH');
      }
    }

    // 9. Collect Pickups within wheel and chassis range
    this.checkPickups();
  }

  private applySuspensionForce(
    anchorX: number,
    anchorY: number,
    wheelX: number,
    wheelY: number,
    chassisVx: number,
    chassisVy: number,
    wheelVx: number,
    wheelVy: number,
    leverArmX: number,
    leverArmY: number,
    stiffness: number,
    damping: number,
    dt: number
  ): void {
    const s = this.state;
    const v = this.vehicle;

    // Vector from wheel to anchor
    const dx = anchorX - wheelX;
    const dy = anchorY - wheelY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;

    const restLen = 4; // Compact rest length between anchor and wheel hub
    const delta = dist - restLen;

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Relative velocity along spring direction
    const relVx = chassisVx - wheelVx;
    const relVy = chassisVy - wheelVy;
    const relVel = relVx * dirX + relVy * dirY;

    // Spring + Damper force magnitude
    const springForce = stiffness * delta + damping * relVel;

    const fx = springForce * dirX;
    const fy = springForce * dirY;

    // Apply to wheel
    const invWheelMass = 1 / v.wheelMass;
    if (wheelX === s.rearX) {
      s.rearVx += (fx * invWheelMass) * dt;
      s.rearVy += (fy * invWheelMass) * dt;
    } else {
      s.frontVx += (fx * invWheelMass) * dt;
      s.frontVy += (fy * invWheelMass) * dt;
    }

    // Apply equal & opposite force to chassis
    const invBodyMass = 1 / v.bodyMass;
    s.vx -= (fx * invBodyMass) * dt;
    s.vy -= (fy * invBodyMass) * dt;

    // Torque on chassis = r x F
    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);
    const worldRx = leverArmX * cosA - leverArmY * sinA;
    const worldRy = leverArmX * sinA + leverArmY * cosA;

    const torque = worldRx * -fy - worldRy * -fx;
    const momentOfInertia = v.bodyMass * (v.bodyWidth * v.bodyWidth + v.bodyHeight * v.bodyHeight) * 0.0015;
    s.angularVelocity += (torque / momentOfInertia) * dt;
  }

  private resolveWheelGround(
    wx: number,
    wy: number,
    wvx: number,
    wvy: number,
    wAngVel: number,
    radius: number,
    updateWheel: (vx: number, vy: number, w: number) => void,
    dt: number,
    tiresMult: number,
    isPowered: boolean,
    throttle: number,
    engineMult: number
  ): boolean {
    const groundY = this.terrain.getGroundHeight(wx);
    const bottomY = wy + radius;

    if (bottomY < groundY) {
      // In air
      let newAngVel = wAngVel * 0.98;
      if (isPowered && throttle !== 0) {
        newAngVel += throttle * 28 * engineMult * dt;
      }
      updateWheel(wvx, wvy, newAngVel);
      return false;
    }

    // Ground penetration
    const penetration = bottomY - groundY;
    const normal = this.terrain.getGroundNormal(wx);

    // Position correction to stay on surface
    const corY = wy - normal.ny * penetration * 0.75;
    const corX = wx - normal.nx * penetration * 0.75;

    // Velocity projection on normal and tangent
    const normalVel = wvx * normal.nx + wvy * normal.ny;
    const tangentX = -normal.ny;
    const tangentY = normal.nx;
    let tangentVel = wvx * tangentX + wvy * tangentY;

    // Elastic repulsion along normal
    let newNormVel = normalVel;
    if (normalVel > 0) {
      // Moving into ground, push back
      newNormVel = -normalVel * 0.15;
    }

    // Drive torque / Engine acceleration applied through wheel
    const friction = this.biome.friction * tiresMult;
    let newAngVel = wAngVel;

    if (isPowered && throttle !== 0 && this.state.fuel > 0) {
      const driveForce = throttle * this.vehicle.maxTorque * engineMult * 2.5;
      tangentVel += driveForce * dt;
      newAngVel += throttle * 35 * dt;

      // Anti-wheelie chassis reaction torque
      this.state.angularVelocity -= throttle * 0.85 * dt;
    }

    // Ground friction deceleration against slipping
    const rimSpeed = newAngVel * (radius * 0.08);
    const slip = tangentVel - rimSpeed;
    tangentVel -= slip * Math.min(1, friction * 4.0 * dt);
    newAngVel += (slip / radius) * 12 * dt;

    // Reconstruct velocity from normal and tangent
    const newVx = tangentVel * tangentX + newNormVel * normal.nx;
    const newVy = tangentVel * tangentY + newNormVel * normal.ny;

    updateWheel(newVx, newVy, newAngVel);
    return true;
  }

  private checkPickups(): void {
    const s = this.state;
    const checkRadius = 38;

    const chunks = this.terrain.getVisibleChunks(s.x - 150, s.x + 150);
    for (const chunk of chunks) {
      for (const pickup of chunk.pickups) {
        if (pickup.collected) continue;

        const dist = Math.hypot(pickup.x - s.x, pickup.y - s.y);
        if (dist <= checkRadius + pickup.radius) {
          pickup.collected = true;

          if (pickup.type === 'FUEL') {
            this.state.fuel = 100;
            this.addNotification('وقود 100%! (Full Fuel)', 50);
            this.onSoundTrigger?.('fuel');
          } else {
            // Coin
            this.coinsCollectedThisRun += pickup.value;
            this.onSoundTrigger?.('coin', pickup.value);
          }
        }
      }
    }
  }

  public triggerDeath(reason: 'CRASH' | 'FUEL_EMPTY'): void {
    if (this.state.isDead) return;
    this.state.isDead = true;
    this.state.deathReason = reason;
    if (reason === 'CRASH') {
      this.onSoundTrigger?.('crash');
      // Impart crash scatter velocity
      this.state.angularVelocity += (Math.random() - 0.5) * 8;
      this.state.vx *= 0.5;
    }
  }

  private addNotification(text: string, coinsBonus: number): void {
    if (coinsBonus > 0) {
      this.coinsCollectedThisRun += coinsBonus;
    }
    this.activeNotifications.push({
      id: this.nextNotifId++,
      text,
      coinsBonus,
      alpha: 1.0,
      yOffset: 0,
    });
  }

  private updateNotifications(dt: number): void {
    for (let i = this.activeNotifications.length - 1; i >= 0; i--) {
      const n = this.activeNotifications[i];
      n.alpha -= dt * 0.8;
      n.yOffset -= dt * 30;
      if (n.alpha <= 0) {
        this.activeNotifications.splice(i, 1);
      }
    }
  }

  public getStats(highScore: number): GameStats {
    const distanceMeters = Math.max(0, Math.floor(this.state.x / 10));
    return {
      distance: distanceMeters,
      coinsCollected: this.coinsCollectedThisRun,
      flipsCount: this.stuntsCount,
      maxAirTime: Math.round(this.maxAirTime * 10) / 10,
      reason: this.state.deathReason,
      isNewRecord: distanceMeters > highScore,
    };
  }
}
