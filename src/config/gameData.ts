/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Biome, BiomeId, PlayerProfile, VehicleDef, VehicleId, VehicleUpgrades } from '../types/game';

export const BIOMES: Record<BiomeId, Biome> = {
  countryside: {
    id: 'countryside',
    name: 'الريف الأخضر',
    nameEn: 'Countryside',
    description: 'تلال خضراء كلاسيكية مع مروج متموجة وجاذبية أرضية قياسية.',
    gravity: 9.8,
    friction: 0.85,
    skyColors: ['#0284c7', '#7dd3fc'], // Deep sky to cyan
    groundSurfaceColor: '#22c55e', // Lush green
    groundFillColors: ['#573919', '#27170a'], // Rich soil
    accentColor: '#16a34a',
    hillScaleX: 0.0035,
    hillScaleY: 85,
    particleColor: '#854d0e',
    musicMood: 'country',
  },
  desert: {
    id: 'desert',
    name: 'الصحراء الكبرى',
    nameEn: 'Desert Dunes',
    description: 'كثبان رملية وعرة وقمم حادة تتطلب تحكماً دقيقاً بقوة السحب.',
    gravity: 9.8,
    friction: 0.72,
    skyColors: ['#c2410c', '#fdba74'], // Sunset amber
    groundSurfaceColor: '#f59e0b', // Warm dune sand
    groundFillColors: ['#b45309', '#78350f'], // Deep sand strata
    accentColor: '#d97706',
    hillScaleX: 0.0045,
    hillScaleY: 110,
    particleColor: '#fcd34d',
    musicMood: 'desert',
  },
  moon: {
    id: 'moon',
    name: 'سطح القمر',
    nameEn: 'Moon Surface',
    description: 'جاذبية قمرية منخفضة للغاية (0.35G) تتيح قفزات بهلوانية أسطورية وطيراناً طويلاً!',
    gravity: 3.5,
    friction: 0.78,
    skyColors: ['#020617', '#0f172a'], // Deep cosmic dark
    groundSurfaceColor: '#cbd5e1', // Lunar dust
    groundFillColors: ['#334155', '#1e293b'], // Basalt rock
    accentColor: '#94a3b8',
    hillScaleX: 0.003,
    hillScaleY: 130,
    particleColor: '#94a3b8',
    musicMood: 'space',
  },
};

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  jeep: {
    id: 'jeep',
    name: 'جيب التلال الكلاسيكي',
    nameEn: 'Classic Hill Jeep',
    description: 'سيارة دفع رباعي متوازنة وممتازة للتسلق والتحكم في الهواء.',
    cost: 0,
    unlockedByDefault: true,
    color: '#dc2626', // Red
    accentColor: '#fef08a', // Yellow trim
    bodyWidth: 80,
    bodyHeight: 34,
    wheelRadius: 16,
    wheelDistance: 28,
    wheelBaseY: 18,
    bodyMass: 1.2,
    wheelMass: 0.35,
    springStiffness: 140,
    springDamping: 12,
    maxTorque: 280,
    maxSpeed: 42,
    allWheelDrive: true,
  },
  truck: {
    id: 'truck',
    name: 'الشاحنة العملاقة (Monster Truck)',
    nameEn: 'Monster Truck',
    description: 'عجلات ضخمة ونظام تعليق هيدروليكي جبار لا يوقفه أي تل عالي.',
    cost: 3000,
    unlockedByDefault: false,
    color: '#2563eb', // Royal Blue
    accentColor: '#f97316', // Orange fire
    bodyWidth: 95,
    bodyHeight: 40,
    wheelRadius: 23,
    wheelDistance: 34,
    wheelBaseY: 22,
    bodyMass: 1.8,
    wheelMass: 0.6,
    springStiffness: 190,
    springDamping: 16,
    maxTorque: 420,
    maxSpeed: 38,
    allWheelDrive: true,
  },
  buggy: {
    id: 'buggy',
    name: 'عربة القمر النفاثة (Dune Buggy)',
    nameEn: 'Lunar Buggy',
    description: 'هيكل أنبوبي خفيف جداً مع سرعة قصوى فائقة ورشاقة مذهلة في الهواء.',
    cost: 7500,
    unlockedByDefault: false,
    color: '#10b981', // Neon Emerald
    accentColor: '#6366f1', // Indigo frame
    bodyWidth: 82,
    bodyHeight: 28,
    wheelRadius: 18,
    wheelDistance: 32,
    wheelBaseY: 16,
    bodyMass: 0.9,
    wheelMass: 0.28,
    springStiffness: 130,
    springDamping: 11,
    maxTorque: 350,
    maxSpeed: 52,
    allWheelDrive: false,
  },
};

export const INITIAL_UPGRADES: VehicleUpgrades = {
  engine: 1,
  tires: 1,
  suspension: 1,
  fuel: 1,
};

export const DEFAULT_PROFILE: PlayerProfile = {
  coins: 400, // Starting bonus so player can try first upgrade immediately!
  unlockedVehicles: ['jeep'],
  selectedVehicle: 'jeep',
  selectedBiome: 'countryside',
  upgrades: {
    jeep: { ...INITIAL_UPGRADES },
    truck: { ...INITIAL_UPGRADES },
    buggy: { ...INITIAL_UPGRADES },
  },
  highScores: {
    countryside: 0,
    desert: 0,
    moon: 0,
  },
  soundEnabled: true,
};

const STORAGE_KEY = 'HILL_CLIMB_PHYSICS_PROFILE_V1';

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        upgrades: {
          jeep: { ...INITIAL_UPGRADES, ...(parsed.upgrades?.jeep || {}) },
          truck: { ...INITIAL_UPGRADES, ...(parsed.upgrades?.truck || {}) },
          buggy: { ...INITIAL_UPGRADES, ...(parsed.upgrades?.buggy || {}) },
        },
        highScores: {
          countryside: 0,
          desert: 0,
          moon: 0,
          ...(parsed.highScores || {}),
        },
      };
    }
  } catch (e) {
    console.warn('Failed to load profile from localStorage', e);
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save profile to localStorage', e);
  }
}

/**
 * Upgrade Cost Formula: level * 250 + level^1.8 * 80
 */
export function getUpgradeCost(currentLevel: number): number {
  if (currentLevel >= 10) return 0;
  return Math.round(currentLevel * 250 + Math.pow(currentLevel, 1.7) * 90);
}

/**
 * Calculates effective multiplier for an upgrade (level 1 to 10)
 */
export function getUpgradeMultiplier(level: number, step = 0.08): number {
  return 1 + (level - 1) * step;
}
