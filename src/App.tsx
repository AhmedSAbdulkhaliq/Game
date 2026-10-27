/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BiomeId,
  GameState,
  GameStats,
  PlayerProfile,
  VehicleId,
  VehicleUpgrades,
} from './types/game';
import {
  BIOMES,
  DEFAULT_PROFILE,
  VEHICLES,
  getUpgradeCost,
  loadProfile,
  saveProfile,
} from './config/gameData';
import { soundManager } from './audio/SoundManager';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GarageModal } from './components/GarageModal';
import { GameOverModal } from './components/GameOverModal';
import { TitleScreen } from './components/TitleScreen';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [throttle, setThrottle] = useState<number>(0);
  const [gameKey, setGameKey] = useState<number>(1); // Key to cleanly remount canvas on retry

  // HUD live states
  const [hudFuel, setHudFuel] = useState<number>(100);
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudDistance, setHudDistance] = useState<number>(0);
  const [hudCoins, setHudCoins] = useState<number>(0);

  // Game Over summary
  const [lastStats, setLastStats] = useState<GameStats | null>(null);

  // Ref tracking pressed keys to avoid sticky keys and compute combined throttle
  const keysPressedRef = useRef<{ gas: boolean; brake: boolean }>({
    gas: false,
    brake: false,
  });

  // Sync sound manager with profile
  useEffect(() => {
    soundManager.setMuted(!profile.soundEnabled);
  }, [profile.soundEnabled]);

  // Persist profile updates
  const updateProfile = useCallback(
    (updater: (prev: PlayerProfile) => PlayerProfile) => {
      setProfile((prev) => {
        const next = updater(prev);
        saveProfile(next);
        return next;
      });
    },
    []
  );

  // Keyboard input handler
  useEffect(() => {
    const computeThrottle = () => {
      const { gas, brake } = keysPressedRef.current;
      if (gas && !brake) return 1;
      if (brake && !gas) return -1;
      return 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysPressedRef.current.gas = true;
        setThrottle(computeThrottle());
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'Space') {
        keysPressedRef.current.brake = true;
        setThrottle(computeThrottle());
      } else if (e.code === 'Escape') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysPressedRef.current.gas = false;
        setThrottle(computeThrottle());
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'Space') {
        keysPressedRef.current.brake = false;
        setThrottle(computeThrottle());
      }
    };

    const handleBlur = () => {
      // Clear held keys on window blur per game craft guidelines
      keysPressedRef.current = { gas: false, brake: false };
      setThrottle(0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState]);

  // Handle Game Over
  const handleGameOver = useCallback(
    (stats: GameStats) => {
      setLastStats(stats);
      setGameState('GAMEOVER');

      // Add coins to profile
      updateProfile((prev) => {
        const currentHigh = prev.highScores[prev.selectedBiome] || 0;
        const newHigh = Math.max(currentHigh, stats.distance);

        return {
          ...prev,
          coins: prev.coins + stats.coinsCollected,
          highScores: {
            ...prev.highScores,
            [prev.selectedBiome]: newHigh,
          },
        };
      });
    },
    [updateProfile]
  );

  // HUD update callback
  const handleHUDUpdate = useCallback(
    (fuel: number, speed: number, distance: number, coins: number) => {
      setHudFuel(fuel);
      setHudSpeed(speed);
      setHudDistance(distance);
      setHudCoins(coins);
    },
    []
  );

  // Actions
  const handleStartGame = () => {
    setGameKey((k) => k + 1);
    setThrottle(0);
    keysPressedRef.current = { gas: false, brake: false };
    setGameState('PLAYING');
  };

  const handleRetry = () => {
    handleStartGame();
  };

  const handleTogglePause = () => {
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
  };

  const handleToggleSound = () => {
    updateProfile((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  };

  const handleSelectVehicle = (id: VehicleId) => {
    updateProfile((prev) => ({
      ...prev,
      selectedVehicle: id,
    }));
  };

  const handleSelectBiome = (id: BiomeId) => {
    updateProfile((prev) => ({
      ...prev,
      selectedBiome: id,
    }));
  };

  const handleUnlockVehicle = (id: VehicleId) => {
    const veh = VEHICLES[id];
    if (profile.coins >= veh.cost && !profile.unlockedVehicles.includes(id)) {
      soundManager.playFuel(); // Celebratory chime
      updateProfile((prev) => ({
        ...prev,
        coins: prev.coins - veh.cost,
        unlockedVehicles: [...prev.unlockedVehicles, id],
        selectedVehicle: id,
      }));
    }
  };

  const handleUpgradePart = (part: keyof VehicleUpgrades) => {
    const currentLevel = profile.upgrades[profile.selectedVehicle][part];
    const cost = getUpgradeCost(currentLevel);

    if (currentLevel < 10 && profile.coins >= cost) {
      soundManager.playCoin(100);
      updateProfile((prev) => ({
        ...prev,
        coins: prev.coins - cost,
        upgrades: {
          ...prev.upgrades,
          [prev.selectedVehicle]: {
            ...prev.upgrades[prev.selectedVehicle],
            [part]: currentLevel + 1,
          },
        },
      }));
    }
  };

  const currentVehicle = VEHICLES[profile.selectedVehicle];
  const currentBiome = BIOMES[profile.selectedBiome];
  const currentUpgrades = profile.upgrades[profile.selectedVehicle];
  const currentHighScore = profile.highScores[profile.selectedBiome] || 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* 1. 60FPS PHYSICS & CANVAS LAYER (Mounted during play or title background) */}
      <div className="absolute inset-0 z-0">
        <GameCanvas
          key={`${gameKey}-${profile.selectedVehicle}-${profile.selectedBiome}`}
          vehicle={currentVehicle}
          upgrades={currentUpgrades}
          biome={currentBiome}
          isPaused={gameState === 'PAUSED' || gameState === 'GARAGE' || gameState === 'TITLE'}
          throttle={throttle}
          onGameOver={handleGameOver}
          onHUDUpdate={handleHUDUpdate}
          highScore={currentHighScore}
        />
      </div>

      {/* 2. HUD LAYER (Active during gameplay) */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <HUD
          fuel={hudFuel}
          speed={hudSpeed}
          distance={hudDistance}
          coins={hudCoins}
          highScore={currentHighScore}
          biomeName={currentBiome.name}
          isPaused={gameState === 'PAUSED'}
          soundEnabled={profile.soundEnabled}
          onTogglePause={handleTogglePause}
          onToggleSound={handleToggleSound}
          onThrottleChange={setThrottle}
        />
      )}

      {/* 3. PAUSE OVERLAY */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <h2 className="text-2xl font-black text-white mb-1">اللعبة متوقفة مؤقتاً</h2>
            <span className="text-xs text-slate-400 mb-6">GAME PAUSED</span>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setGameState('PLAYING');
                }}
                className="w-full py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg cursor-pointer transition-all"
              >
                استئناف القيادة (Resume)
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  handleRetry();
                }}
                className="w-full py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-all"
              >
                إعادة المحاولة من البداية
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setGameState('GARAGE');
                }}
                className="w-full py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-all"
              >
                الكراج والترقيات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TITLE SCREEN */}
      {gameState === 'TITLE' && (
        <TitleScreen
          profile={profile}
          soundEnabled={profile.soundEnabled}
          onToggleSound={handleToggleSound}
          onStartGame={handleStartGame}
          onOpenGarage={() => setGameState('GARAGE')}
        />
      )}

      {/* 5. GARAGE & UPGRADES MODAL */}
      {gameState === 'GARAGE' && (
        <GarageModal
          profile={profile}
          onSelectVehicle={handleSelectVehicle}
          onSelectBiome={handleSelectBiome}
          onUnlockVehicle={handleUnlockVehicle}
          onUpgradePart={handleUpgradePart}
          onStartGame={handleStartGame}
        />
      )}

      {/* 6. GAME OVER MODAL */}
      {gameState === 'GAMEOVER' && lastStats && (
        <GameOverModal
          stats={lastStats}
          totalCoins={profile.coins}
          onRetry={handleRetry}
          onOpenGarage={() => setGameState('GARAGE')}
        />
      )}
    </div>
  );
}
