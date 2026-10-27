/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Biome, PickupItem, PickupType } from '../types/game';

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface TerrainChunk {
  startIndex: number;
  endIndex: number;
  startX: number;
  endX: number;
  points: TerrainPoint[];
  pickups: PickupItem[];
  distanceMarkers: { x: number; y: number; distance: number }[];
}

export class TerrainGenerator {
  public biome: Biome;
  private stepSize: number = 24; // Horizontal distance between terrain vertices
  private generatedChunks: Map<number, TerrainChunk> = new Map();
  private nextPickupId: number = 1;
  private nextFuelMilestone: number = 120; // First fuel can around 120m
  private lastMarkedMilestone: number = 0;

  constructor(biome: Biome) {
    this.biome = biome;
  }

  public setBiome(biome: Biome): void {
    this.biome = biome;
    this.reset();
  }

  public reset(): void {
    this.generatedChunks.clear();
    this.nextPickupId = 1;
    this.nextFuelMilestone = 120;
    this.lastMarkedMilestone = 0;
  }

  /**
   * Continuous procedural elevation function based on multi-harmonic sinusoidal waves
   */
  public getGroundHeight(x: number): number {
    const baseElevation = 520; // Standard ground line

    if (x < 0) {
      // Gentle flat starting platform
      return baseElevation;
    }

    const { hillScaleX, hillScaleY, id } = this.biome;

    // First 40 meters is smooth runway for starting
    if (x < 120) {
      const blend = x / 120;
      const raw = this.calculateRawHeight(x, hillScaleX, hillScaleY, id);
      return baseElevation + (raw - baseElevation) * blend;
    }

    return this.calculateRawHeight(x, hillScaleX, hillScaleY, id);
  }

  private calculateRawHeight(x: number, scaleX: number, scaleY: number, biomeId: string): number {
    const baseElevation = 520;

    // Harmonic 1: Long rolling waves
    const w1 = Math.sin(x * scaleX) * scaleY;
    // Harmonic 2: Medium hills and crests
    const w2 = Math.sin(x * scaleX * 2.3 + 1.2) * (scaleY * 0.45);
    // Harmonic 3: Rapid bumps / terrain roughness
    const w3 = Math.sin(x * scaleX * 5.1 + 2.7) * (scaleY * 0.15);

    let specificModifier = 0;

    if (biomeId === 'desert') {
      // Desert: Sharper dune crests (absolute sine) and gentle slip faces
      const duneWave = Math.sin(x * scaleX * 0.8);
      const sharpCrest = Math.abs(Math.sin(x * scaleX * 1.6)) * (scaleY * 0.35);
      specificModifier = (duneWave > 0 ? duneWave * 1.2 : duneWave * 0.7) * scaleY * 0.5 - sharpCrest;
    } else if (biomeId === 'moon') {
      // Moon: Wide crater dips and sudden steep rims
      const craterWave = Math.cos(x * scaleX * 0.7);
      const craterShape = Math.pow(Math.sin(x * scaleX * 1.4), 2) * scaleY * 0.6;
      specificModifier = craterWave * scaleY * 0.6 - craterShape;
    } else {
      // Countryside: Occasional big launch ramp
      const rampMod = Math.sin(x * 0.001);
      if (rampMod > 0.8) {
        specificModifier = -Math.sin((rampMod - 0.8) * Math.PI * 2.5) * 45;
      }
    }

    // In 2D screen coordinates, lower height value = higher on screen (mountain)
    return baseElevation + (w1 + w2 + w3 + specificModifier);
  }

  /**
   * Analytical ground normal vector pointing upwards from the surface
   */
  public getGroundNormal(x: number): { nx: number; ny: number; angle: number } {
    const delta = 1.0;
    const y1 = this.getGroundHeight(x - delta);
    const y2 = this.getGroundHeight(x + delta);
    const dx = delta * 2;
    const dy = y2 - y1;

    // Tangent vector is (dx, dy)
    // Normal vector pointing UP is (-dy, dx) normalized
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const angle = Math.atan2(dy, dx);

    return { nx, ny, angle };
  }

  /**
   * Generates or fetches a 1000px wide chunk of terrain around x
   */
  public getChunk(chunkIndex: number): TerrainChunk {
    if (this.generatedChunks.has(chunkIndex)) {
      return this.generatedChunks.get(chunkIndex)!;
    }

    const chunkSize = 1200; // Chunk width in pixels
    const startX = chunkIndex * chunkSize;
    const endX = startX + chunkSize;
    const points: TerrainPoint[] = [];

    // Generate points along chunk with overlap for smooth polygon stitching
    for (let x = startX - this.stepSize; x <= endX + this.stepSize; x += this.stepSize) {
      points.push({ x, y: this.getGroundHeight(x) });
    }

    // Generate pickups (Coins & Fuel) and Milestones in this chunk
    const pickups: PickupItem[] = [];
    const distanceMarkers: { x: number; y: number; distance: number }[] = [];

    if (startX >= 50) {
      // Check for distance milestones (every 50 meters, 1m = 10px in physics scale)
      const startMeters = Math.floor(startX / 100) * 10;
      const endMeters = Math.floor(endX / 100) * 10;

      for (let m = 50; m <= endMeters + 50; m += 50) {
        const markerX = m * 10;
        if (markerX >= startX && markerX < endX && m > this.lastMarkedMilestone) {
          const markerY = this.getGroundHeight(markerX);
          distanceMarkers.push({ x: markerX, y: markerY, distance: m });
          this.lastMarkedMilestone = Math.max(this.lastMarkedMilestone, m);
        }
      }

      // Check for fuel canisters (every ~120m - 150m)
      const chunkMeters = endX / 10;
      if (chunkMeters >= this.nextFuelMilestone) {
        const fuelX = this.nextFuelMilestone * 10;
        const fuelY = this.getGroundHeight(fuelX) - 28;
        pickups.push({
          id: this.nextPickupId++,
          type: 'FUEL',
          x: fuelX,
          y: fuelY,
          value: 100, // +100% fuel refill
          collected: false,
          radius: 18,
        });
        // Next fuel can placed 130m to 160m ahead
        this.nextFuelMilestone += 135 + Math.floor((Math.sin(fuelX) * 0.5 + 0.5) * 25);
      }

      // Generate coin ribbons along hill crests and slopes
      let curX = startX + 60;
      while (curX < endX - 80) {
        // Place a cluster of 3 to 6 coins
        const coinCount = 3 + Math.floor((Math.sin(curX * 0.05) * 0.5 + 0.5) * 4);
        const arcHeight = (Math.sin(curX * 0.02) * 0.5 + 0.5) * 40; // Some in air, some on ground
        const coinType: PickupType =
          Math.sin(curX * 0.01) > 0.6 ? 'COIN_GOLD' : Math.sin(curX * 0.03) > 0.2 ? 'COIN_SILVER' : 'COIN_BRONZE';
        const val = coinType === 'COIN_GOLD' ? 100 : coinType === 'COIN_SILVER' ? 25 : 5;

        for (let i = 0; i < coinCount; i++) {
          const cx = curX + i * 28;
          const groundY = this.getGroundHeight(cx);
          // Parabolic arc for airborne coins
          const arcOffset = Math.sin((i / (coinCount - 1)) * Math.PI) * arcHeight;
          const cy = groundY - 24 - arcOffset;

          pickups.push({
            id: this.nextPickupId++,
            type: coinType,
            x: cx,
            y: cy,
            value: val,
            collected: false,
            radius: 12,
          });
        }
        // Advance to next cluster
        curX += coinCount * 28 + 140 + Math.floor((Math.cos(curX) * 0.5 + 0.5) * 160);
      }
    }

    const chunk: TerrainChunk = {
      startIndex: chunkIndex,
      endIndex: chunkIndex,
      startX,
      endX,
      points,
      pickups,
      distanceMarkers,
    };

    this.generatedChunks.set(chunkIndex, chunk);

    // Prune very distant old chunks behind player (keep at most 8 active chunks)
    if (this.generatedChunks.size > 12) {
      const minChunkToKeep = chunkIndex - 3;
      for (const [k] of this.generatedChunks.entries()) {
        if (k < minChunkToKeep) {
          this.generatedChunks.delete(k);
        }
      }
    }

    return chunk;
  }

  /**
   * Returns all active chunks covering the visible viewport window [minX, maxX]
   */
  public getVisibleChunks(minX: number, maxX: number): TerrainChunk[] {
    const chunkSize = 1200;
    const minChunk = Math.floor(minX / chunkSize) - 1;
    const maxChunk = Math.ceil(maxX / chunkSize) + 1;
    const chunks: TerrainChunk[] = [];

    for (let c = minChunk; c <= maxChunk; c++) {
      if (c >= -1) {
        chunks.push(this.getChunk(c));
      }
    }

    return chunks;
  }
}
