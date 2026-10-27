/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Biome, GameParticle, GameStats, StuntNotification, VehicleDef, VehicleUpgrades } from '../types/game';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { soundManager } from '../audio/SoundManager';

interface GameCanvasProps {
  vehicle: VehicleDef;
  upgrades: VehicleUpgrades;
  biome: Biome;
  isPaused: boolean;
  throttle: number; // -1 to 1
  onGameOver: (stats: GameStats) => void;
  onHUDUpdate: (fuel: number, speed: number, distance: number, coins: number, maxDistance: number) => void;
  highScore: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  vehicle,
  upgrades,
  biome,
  isPaused,
  throttle,
  onGameOver,
  onHUDUpdate,
  highScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References kept across frames to avoid React re-renders in the 60fps loop
  const terrainRef = useRef<TerrainGenerator>(new TerrainGenerator(biome));
  const physicsRef = useRef<PhysicsEngine>(
    new PhysicsEngine(vehicle, upgrades, biome, terrainRef.current)
  );

  const particlesRef = useRef<GameParticle[]>([]);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.0 });
  const throttleRef = useRef(throttle);
  const isPausedRef = useRef(isPaused);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const hudUpdateCooldownRef = useRef<number>(0);

  // Keep throttle and pause state in sync without rebuilding canvas loop
  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Hook sound trigger from physics engine
  useEffect(() => {
    const physics = physicsRef.current;
    physics.onSoundTrigger = (type, value) => {
      if (type === 'coin') soundManager.playCoin(value || 5);
      else if (type === 'fuel') soundManager.playFuel();
      else if (type === 'landing') soundManager.playLanding(value || 1);
      else if (type === 'crash') {
        soundManager.playCrash();
        spawnCrashDebris(physics.state.x, physics.state.y);
      } else if (type === 'stunt') {
        soundManager.playStunt();
        spawnConfetti(physics.state.x, physics.state.y - 40);
      }
    };
  }, []);

  const spawnCrashDebris = (x: number, y: number) => {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? vehicle.color : '#e2e8f0',
        alpha: 1,
        type: 'debris',
      });
    }
  };

  const spawnConfetti = (x: number, y: number) => {
    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#fbbf24'];
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 70 + Math.random() * 140;
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1.5 + Math.random() * 0.5,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        type: 'confetti',
      });
    }
  };

  // Main 60fps game render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    soundManager.startEngine();

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    lastTimeRef.current = performance.now();

    const render = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      // Clamp delta time to avoid large physics jumps during tab switches
      const dt = Math.min(rawDt, 0.05);

      if (!isPausedRef.current) {
        const physics = physicsRef.current;
        const currentThrottle = throttleRef.current;

        // 1. Step physics
        physics.update(dt, currentThrottle);

        // 2. Update engine audio sound
        const speed = Math.hypot(physics.state.vx, physics.state.vy);
        const speedRatio = Math.min(1.0, speed / (vehicle.maxSpeed * 1.5));
        soundManager.updateEngine(currentThrottle, speedRatio);

        // 3. Spawn wheel particles (dust/exhaust)
        if (physics.state.rearGrounded && Math.abs(currentThrottle) > 0.1) {
          if (Math.random() > 0.4) {
            particlesRef.current.push({
              x: physics.state.rearX,
              y: physics.state.rearY + vehicle.wheelRadius - 2,
              vx: -physics.state.vx * 0.2 + (Math.random() - 0.5) * 20,
              vy: -20 - Math.random() * 30,
              life: 0,
              maxLife: 0.4 + Math.random() * 0.3,
              size: 4 + Math.random() * 6,
              color: biome.particleColor,
              alpha: 0.7,
              type: 'dust',
            });
          }
        }

        // Exhaust smoke puff
        if (currentThrottle > 0 && Math.random() > 0.6) {
          const cosA = Math.cos(physics.state.angle);
          const sinA = Math.sin(physics.state.angle);
          const exhaustX = physics.state.x - (vehicle.bodyWidth * 0.5 + 8) * cosA;
          const exhaustY = physics.state.y - (vehicle.bodyWidth * 0.5 + 8) * sinA - 10;
          particlesRef.current.push({
            x: exhaustX,
            y: exhaustY,
            vx: -physics.state.vx * 0.15 - 15 * cosA + (Math.random() - 0.5) * 10,
            vy: -15 + (Math.random() - 0.5) * 10,
            life: 0,
            maxLife: 0.5 + Math.random() * 0.3,
            size: 3 + Math.random() * 4,
            color: '#64748b',
            alpha: 0.5,
            type: 'smoke',
          });
        }

        // 4. Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          if (p.type === 'debris' || p.type === 'confetti') {
            p.vy += 180 * dt; // gravity
          } else {
            p.size += dt * 4; // expand smoke/dust
          }
          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
          }
        }

        // 5. Update Camera
        const targetCamX = physics.state.x + physics.state.vx * 0.3 + 140;
        const targetCamY = physics.state.y - 40;
        const targetZoom = Math.max(0.78, 1.05 - speedRatio * 0.22);

        cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.08;
        cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.08;
        cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * 0.05;

        // 6. Check Game Over
        if (physics.state.isDead) {
          const stats = physics.getStats(highScore);
          soundManager.stopEngine();
          onGameOver(stats);
          return; // Stop animation loop
        }

        // 7. Throttled HUD update (10 times per second for smooth DOM performance)
        hudUpdateCooldownRef.current += dt;
        if (hudUpdateCooldownRef.current >= 0.08) {
          hudUpdateCooldownRef.current = 0;
          const dist = Math.max(0, Math.floor(physics.state.x / 10));
          const kmh = Math.round(speed * 3.6);
          onHUDUpdate(
            physics.state.fuel,
            kmh,
            dist,
            physics.coinsCollectedThisRun,
            highScore
          );
        }
      }

      // 8. RENDER CANVAS SCENE
      drawScene(ctx, canvas);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      soundManager.stopEngine();
    };
  }, [vehicle, upgrades, biome, onGameOver, onHUDUpdate, highScore]);

  // DRAWING METHODS
  const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const width = canvas.width;
    const height = canvas.height;
    const cam = cameraRef.current;
    const physics = physicsRef.current;
    const terrain = terrainRef.current;

    // A. Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, biome.skyColors[0]);
    skyGrad.addColorStop(1, biome.skyColors[1]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Parallax Sky Objects
    drawCelestialAndParallax(ctx, width, height, cam.x);

    // B. Save Viewport Transform
    ctx.save();
    // Center camera on screen with zoom
    ctx.translate(width * 0.35, height * 0.58);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // Visible terrain window
    const halfW = (width / cam.zoom) * 0.7;
    const minX = cam.x - halfW - 200;
    const maxX = cam.x + halfW + 200;

    // C. Distant Parallax Hills (Layer 2)
    drawParallaxHills(ctx, minX, maxX, cam.x, cam.y);

    // D. Foreground Terrain
    drawForegroundTerrain(ctx, minX, maxX);

    // E. Pickups (Coins and Fuel)
    drawPickups(ctx, minX, maxX);

    // F. Distance Milestones Signs
    drawDistanceMarkers(ctx, minX, maxX);

    // G. Particles (Smoke, Dust, Confetti)
    drawParticles(ctx);

    // H. Vehicle (Chassis, Suspension, Wheels, Driver)
    drawVehicle(ctx, physics.state, vehicle);

    // I. Floating Stunt Notifications
    drawNotifications(ctx, physics.activeNotifications, physics.state.x, physics.state.y);

    ctx.restore();
  };

  const drawCelestialAndParallax = (ctx: CanvasRenderingContext2D, width: number, height: number, camX: number) => {
    if (biome.id === 'moon') {
      // Cosmic Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 45; i++) {
        const sx = ((i * 123 + camX * 0.02) % width + width) % width;
        const sy = (i * 77) % (height * 0.65);
        const sz = (i % 3) + 1;
        ctx.globalAlpha = 0.4 + (Math.sin(i + camX * 0.002) * 0.4);
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.globalAlpha = 1.0;

      // Distant Earth in sky
      const earthX = ((width * 0.75 - camX * 0.015) % width + width) % width;
      const earthY = height * 0.22;
      const earthGrad = ctx.createRadialGradient(earthX - 10, earthY - 10, 5, earthX, earthY, 45);
      earthGrad.addColorStop(0, '#38bdf8');
      earthGrad.addColorStop(0.6, '#0284c7');
      earthGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(earthX, earthY, 40, 0, Math.PI * 2);
      ctx.fill();

      // Earth atmospheric glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (biome.id === 'desert') {
      // Blazing desert sun
      const sunX = width * 0.65;
      const sunY = height * 0.22;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 80);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.4, '#f59e0b');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Countryside sun & clouds
      const sunX = width * 0.8;
      const sunY = height * 0.18;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let c = 0; c < 4; c++) {
        const cloudX = ((c * 380 - camX * 0.05) % (width + 300) + width + 300) % (width + 300) - 150;
        const cloudY = 70 + c * 40;
        drawCloud(ctx, cloudX, cloudY, 60);
      }
    }
  };

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.1, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawParallaxHills = (
    ctx: CanvasRenderingContext2D,
    minX: number,
    maxX: number,
    camX: number,
    camY: number
  ) => {
    ctx.save();
    // Parallax displacement
    const paraX = camX * 0.65;
    const paraY = camY * 0.35 + 240;

    ctx.fillStyle = biome.id === 'moon' ? '#1e293b' : biome.id === 'desert' ? '#9a3412' : '#15803d';
    ctx.globalAlpha = 0.45;

    ctx.beginPath();
    ctx.moveTo(minX, 1600);
    for (let x = minX; x <= maxX; x += 40) {
      const hillY = paraY + Math.sin((x + paraX) * 0.0018) * 120 + Math.cos((x + paraX) * 0.004) * 45;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(maxX, 1600);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawForegroundTerrain = (ctx: CanvasRenderingContext2D, minX: number, maxX: number) => {
    const terrain = terrainRef.current;
    const visibleChunks = terrain.getVisibleChunks(minX, maxX);

    // Collect continuous points
    const points: { x: number; y: number }[] = [];
    for (const chunk of visibleChunks) {
      for (const p of chunk.points) {
        if (p.x >= minX - 60 && p.x <= maxX + 60) {
          points.push(p);
        }
      }
    }

    if (points.length < 2) return;

    // 1. Fill ground body with deep gradient
    ctx.save();
    const groundGrad = ctx.createLinearGradient(0, 300, 0, 1400);
    groundGrad.addColorStop(0, biome.groundFillColors[0]);
    groundGrad.addColorStop(1, biome.groundFillColors[1]);
    ctx.fillStyle = groundGrad;

    ctx.beginPath();
    ctx.moveTo(points[0].x, 1800);
    ctx.lineTo(points[0].x, points[0].y);

    // Smooth spline through terrain points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    const lastP = points[points.length - 1];
    ctx.lineTo(lastP.x, lastP.y);
    ctx.lineTo(lastP.x, 1800);
    ctx.closePath();
    ctx.fill();

    // 2. Thick stylized ground surface crust (Grass / Sand / Moon crust)
    ctx.strokeStyle = biome.groundSurfaceColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    ctx.stroke();

    // 3. Highlight highlight rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  };

  const drawPickups = (ctx: CanvasRenderingContext2D, minX: number, maxX: number) => {
    const terrain = terrainRef.current;
    const visibleChunks = terrain.getVisibleChunks(minX, maxX);
    const time = performance.now() * 0.004;

    for (const chunk of visibleChunks) {
      for (const item of chunk.pickups) {
        if (item.collected || item.x < minX || item.x > maxX) continue;

        ctx.save();
        ctx.translate(item.x, item.y);

        if (item.type === 'FUEL') {
          // Fuel Canister
          const pulse = 1 + Math.sin(time * 3) * 0.06;
          ctx.scale(pulse, pulse);

          // Red Jerrycan body
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.roundRect(-12, -15, 24, 30, 4);
          ctx.fill();

          // Black nozzle/handle
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.roundRect(-9, -20, 18, 6, 2);
          ctx.fill();

          // White Fuel Text / Symbol
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('FUEL', 0, 1);
        } else {
          // Rotating Coin with 3D elliptical spin
          const spinScale = Math.cos(time * 2 + item.id);
          const isGold = item.type === 'COIN_GOLD';
          const isSilver = item.type === 'COIN_SILVER';

          const primaryColor = isGold ? '#eab308' : isSilver ? '#cbd5e1' : '#b45309';
          const rimColor = isGold ? '#fef08a' : isSilver ? '#ffffff' : '#f59e0b';

          ctx.scale(spinScale, 1.0);

          // Outer Glow
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 8;

          // Coin disc
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
          ctx.fill();

          // Coin rim
          ctx.strokeStyle = rimColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner emblem
          ctx.fillStyle = rimColor;
          ctx.font = `bold ${Math.round(item.radius * 0.9)}px "Outfit", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 1);
        }

        ctx.restore();
      }
    }
  };

  const drawDistanceMarkers = (ctx: CanvasRenderingContext2D, minX: number, maxX: number) => {
    const terrain = terrainRef.current;
    const visibleChunks = terrain.getVisibleChunks(minX, maxX);

    for (const chunk of visibleChunks) {
      for (const mark of chunk.distanceMarkers) {
        if (mark.x < minX || mark.x > maxX) continue;

        ctx.save();
        ctx.translate(mark.x, mark.y);

        // Sign pole
        ctx.fillStyle = '#475569';
        ctx.fillRect(-3, -45, 6, 45);

        // Signboard
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-28, -75, 56, 30, 4);
        ctx.fill();
        ctx.stroke();

        // Signboard text
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mark.distance}m`, 0, -60);

        ctx.restore();
      }
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const drawVehicle = (ctx: CanvasRenderingContext2D, s: typeof physicsRef.current.state, v: VehicleDef) => {
    ctx.save();

    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);

    // 1. Suspension Struts (Shock Absorbers)
    const rAnchorX = s.x - v.wheelDistance * cosA - v.wheelBaseY * -sinA;
    const rAnchorY = s.y - v.wheelDistance * sinA + v.wheelBaseY * cosA;

    const fAnchorX = s.x + v.wheelDistance * cosA - v.wheelBaseY * -sinA;
    const fAnchorY = s.y + v.wheelDistance * sinA + v.wheelBaseY * cosA;

    drawSuspensionStrut(ctx, rAnchorX, rAnchorY, s.rearX, s.rearY);
    drawSuspensionStrut(ctx, fAnchorX, fAnchorY, s.frontX, s.frontY);

    // 2. Wheels
    drawWheel(ctx, s.rearX, s.rearY, s.rearAngVel, v.wheelRadius, v.id === 'truck');
    drawWheel(ctx, s.frontX, s.frontY, s.frontAngVel, v.wheelRadius, v.id === 'truck');

    // 3. Driver & Head
    drawDriver(ctx, s.x, s.y, s.angle, v);

    // 4. Chassis Body
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    drawChassis(ctx, v);

    ctx.restore();
  };

  const drawSuspensionStrut = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    ctx.save();
    // Metallic shock strut cylinder
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Coil spring look
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const nx = -dy / dist;
    const ny = dx / dist;

    const coils = 5;
    for (let c = 0; c <= coils; c++) {
      const t = c / coils;
      const px = x1 + dx * t + (c % 2 === 0 ? 4 : -4) * nx;
      const py = y1 + dy * t + (c % 2 === 0 ? 4 : -4) * ny;
      if (c === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawWheel = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    radius: number,
    isMonsterTruck: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Outer rubber tire
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Deep Tire Treads
    ctx.fillStyle = '#334155';
    const treads = isMonsterTruck ? 10 : 8;
    for (let t = 0; t < treads; t++) {
      ctx.rotate((Math.PI * 2) / treads);
      ctx.fillRect(-3, -radius, 6, 6);
    }

    // Inner Alloy Rim
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Spokes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    for (let s = 0; s < 4; s++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, radius * 0.55);
      ctx.stroke();
    }

    // Center Red Hub Nut
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawDriver = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    v: VehicleDef
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Driver Torso (centered in cockpit)
    const torsoX = -8;
    const torsoY = -v.bodyHeight * 0.45;

    ctx.fillStyle = '#1e293b'; // Racing suit
    ctx.beginPath();
    ctx.roundRect(torsoX - 8, torsoY - 14, 16, 20, 4);
    ctx.fill();

    // Driver Helmet Head
    const headX = torsoX + 2;
    const headY = torsoY - 20;

    // Helmet dome
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(headX, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Helmet Racing Stripe
    ctx.strokeStyle = v.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headX, headY, 11, -Math.PI * 0.7, Math.PI * 0.3);
    ctx.stroke();

    // Dark Visor Glass
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(headX + 4, headY, 6, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.fill();

    // Arms holding steering wheel
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(torsoX + 4, torsoY - 4);
    ctx.lineTo(torsoX + 16, torsoY - 10);
    ctx.stroke();

    ctx.restore();
  };

  const drawChassis = (ctx: CanvasRenderingContext2D, v: VehicleDef) => {
    const hw = v.bodyWidth / 2;
    const hh = v.bodyHeight / 2;

    if (v.id === 'truck') {
      // Monster Truck Body: Aggressive heavy cabin & roll-bar
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(-hw, hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(hw - 6, -hh * 0.2);
      ctx.lineTo(hw * 0.4, -hh * 0.3);
      ctx.lineTo(hw * 0.1, -hh);
      ctx.lineTo(-hw * 0.6, -hh);
      ctx.lineTo(-hw, -hh * 0.3);
      ctx.closePath();
      ctx.fill();

      // Front bumper
      ctx.fillStyle = '#475569';
      ctx.fillRect(hw - 4, 0, 10, hh);

      // Roll cage bars
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.5, -hh);
      ctx.lineTo(-hw * 0.8, hh);
      ctx.stroke();

      // Side flame decal
      ctx.fillStyle = v.accentColor;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.4, 0);
      ctx.lineTo(hw * 0.2, 0);
      ctx.lineTo(hw * 0.1, hh * 0.5);
      ctx.lineTo(-hw * 0.2, hh * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (v.id === 'buggy') {
      // Lunar / Dune Buggy: Tubular open cage & spoiler
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(-hw, hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(hw - 10, -hh * 0.2);
      ctx.lineTo(0, -hh * 0.4);
      ctx.lineTo(-hw * 0.5, -hh * 0.8);
      ctx.lineTo(-hw, -hh * 0.2);
      ctx.closePath();
      ctx.fill();

      // Tubular cage frame
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Rear aerodynamic spoiler
      ctx.fillStyle = v.accentColor;
      ctx.fillRect(-hw - 8, -hh - 4, 16, 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-hw - 2, -hh, 4, hh);
    } else {
      // Classic Jeep Body
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.moveTo(-hw, hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(hw, -hh * 0.1);
      ctx.lineTo(hw * 0.3, -hh * 0.1);
      ctx.lineTo(hw * 0.1, -hh);
      ctx.lineTo(-hw * 0.7, -hh);
      ctx.lineTo(-hw, -hh * 0.3);
      ctx.closePath();
      ctx.fill();

      // Yellow racing accent trim
      ctx.fillStyle = v.accentColor;
      ctx.fillRect(-hw + 8, hh * 0.1, hw * 1.6, 5);

      // Windshield glass
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.beginPath();
      ctx.moveTo(hw * 0.28, -hh * 0.15);
      ctx.lineTo(hw * 0.08, -hh * 0.9);
      ctx.lineTo(-hw * 0.2, -hh * 0.9);
      ctx.lineTo(-hw * 0.1, -hh * 0.15);
      ctx.closePath();
      ctx.fill();

      // Headlight
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(hw - 2, 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawNotifications = (
    ctx: CanvasRenderingContext2D,
    notifs: StuntNotification[],
    carX: number,
    carY: number
  ) => {
    for (const n of notifs) {
      ctx.save();
      ctx.globalAlpha = n.alpha;
      ctx.translate(carX, carY - 60 + n.yOffset);

      ctx.font = 'bold 16px "Cairo", sans-serif';
      ctx.textAlign = 'center';

      // Text glow outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(n.text, 0, 0);

      // Radiant Gold / Cyan Fill
      ctx.fillStyle = n.coinsBonus > 0 ? '#fde047' : '#38bdf8';
      ctx.fillText(n.text, 0, 0);

      if (n.coinsBonus > 0) {
        ctx.font = 'bold 14px "Outfit", sans-serif';
        ctx.fillStyle = '#4ade80';
        ctx.strokeText(`+${n.coinsBonus} COINS`, 0, 18);
        ctx.fillText(`+${n.coinsBonus} COINS`, 0, 18);
      }

      ctx.restore();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
