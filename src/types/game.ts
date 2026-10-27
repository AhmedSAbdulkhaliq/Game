/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'TITLE' | 'GARAGE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type BiomeId = 'countryside' | 'desert' | 'moon';

export interface Biome {
  id: BiomeId;
  name: string;
  nameEn: string;
  description: string;
  gravity: number; // e.g. 9.8 for earth, 3.5 for moon
  friction: number; // ground surface friction
  skyColors: [string, string]; // gradient top, bottom
  groundSurfaceColor: string;
  groundFillColors: [string, string]; // gradient top, bottom
  accentColor: string;
  hillScaleX: number; // wavelength multiplier
  hillScaleY: number; // height variance
  particleColor: string;
  musicMood: string;
}

export type VehicleId = 'jeep' | 'truck' | 'buggy';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  nameEn: string;
  description: string;
  cost: number;
  unlockedByDefault: boolean;
  color: string;
  accentColor: string;
  // Dimensions & Physics properties
  bodyWidth: number;
  bodyHeight: number;
  wheelRadius: number;
  wheelDistance: number; // distance from center to front/rear wheel
  wheelBaseY: number; // Y offset of wheel axle rest position
  bodyMass: number;
  wheelMass: number;
  springStiffness: number;
  springDamping: number;
  maxTorque: number;
  maxSpeed: number;
  allWheelDrive: boolean;
}

export interface VehicleUpgrades {
  engine: number; // 1 - 10
  tires: number; // 1 - 10
  suspension: number; // 1 - 10
  fuel: number; // 1 - 10
}

export interface PlayerProfile {
  coins: number;
  unlockedVehicles: VehicleId[];
  selectedVehicle: VehicleId;
  selectedBiome: BiomeId;
  upgrades: Record<VehicleId, VehicleUpgrades>;
  highScores: Record<BiomeId, number>; // distance in meters
  soundEnabled: boolean;
}

export type PickupType = 'COIN_BRONZE' | 'COIN_SILVER' | 'COIN_GOLD' | 'FUEL';

export interface PickupItem {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  value: number;
  collected: boolean;
  radius: number;
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'dust' | 'smoke' | 'sparkle' | 'debris' | 'confetti';
}

export interface StuntNotification {
  id: number;
  text: string;
  coinsBonus: number;
  alpha: number;
  yOffset: number;
}

export interface GameStats {
  distance: number;
  coinsCollected: number;
  flipsCount: number;
  maxAirTime: number;
  reason: 'CRASH' | 'FUEL_EMPTY' | 'NONE';
  isNewRecord: boolean;
}
