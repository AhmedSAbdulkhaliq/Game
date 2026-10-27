/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, Wrench, Volume2, VolumeX, Trophy, Coins, Compass } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { BIOMES, VEHICLES } from '../config/gameData';
import { soundManager } from '../audio/SoundManager';

interface TitleScreenProps {
  profile: PlayerProfile;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartGame: () => void;
  onOpenGarage: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  profile,
  soundEnabled,
  onToggleSound,
  onStartGame,
  onOpenGarage,
}) => {
  const currentVehicle = VEHICLES[profile.selectedVehicle];
  const currentBiome = BIOMES[profile.selectedBiome];
  const currentBest = profile.highScores[profile.selectedBiome] || 0;

  // Listen for Enter or Space to quickly start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        soundManager.playClick();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-12 select-none overflow-hidden bg-radial from-slate-900/40 via-slate-950/80 to-slate-950">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between gap-4">
        {/* Current Biome & Record Badge */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl">
          <Compass className="w-5 h-5 text-sky-400" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              المرحلة المختارة
            </span>
            <span className="text-sm font-black text-white">{currentBiome.name}</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-800 mx-1" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              الرقم القياسي
            </span>
            <span className="font-num text-sm font-black text-amber-300 tabular-nums">
              {currentBest} م
            </span>
          </div>
        </div>

        {/* Coins Balance & Sound Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-500/40 rounded-2xl px-4 py-2 shadow-xl">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="font-num text-xl font-black text-amber-300 tabular-nums">
              {profile.coins}
            </span>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onToggleSound();
            }}
            className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 shadow-xl transition-transform active:scale-95 cursor-pointer"
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-sky-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* CENTER: TITLE LOCKUP & HERO CENTERPIECE */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        {/* Custom Inline SVG Title Lockup */}
        <div className="relative mb-6 drop-shadow-2xl">
          <svg className="w-72 sm:w-96 md:w-[480px] h-auto" viewBox="0 0 500 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>

            {/* Hill Wave background contour */}
            <path
              d="M10 110 Q 120 40, 240 90 T 490 60 L 490 120 L 10 120 Z"
              fill="url(#hillGrad)"
              opacity="0.3"
            />
            <path
              d="M10 115 Q 140 60, 260 100 T 490 75"
              stroke="url(#hillGrad)"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Title Text */}
            <text
              x="250"
              y="68"
              textAnchor="middle"
              fontFamily="Cairo, sans-serif"
              fontWeight="900"
              fontSize="48"
              fill="url(#textGrad)"
              stroke="#0f172a"
              strokeWidth="8"
              paintOrder="stroke fill"
            >
              تسلق التلال 2D
            </text>

            <text
              x="250"
              y="104"
              textAnchor="middle"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="18"
              letterSpacing="6"
              fill="#38bdf8"
            >
              HILL CLIMB PHYSICS
            </text>
          </svg>
        </div>

        {/* Selected Vehicle Badge */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-5 py-2.5 mb-8 shadow-xl">
          <div
            className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
            style={{ backgroundColor: currentVehicle.color }}
          />
          <span className="text-sm font-black text-slate-200">
            المركبة الحالية: {currentVehicle.name}
          </span>
          <span className="text-xs text-sky-400 font-mono">
            [ م {profile.upgrades[profile.selectedVehicle].engine} محرك ]
          </span>
        </div>

        {/* Action Buttons: START & GARAGE */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => {
              soundManager.playClick();
              onStartGame();
            }}
            className="px-10 py-4 rounded-2xl font-black text-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-slate-950 shadow-2xl shadow-emerald-950 flex items-center gap-3 cursor-pointer transition-all hover:scale-105"
          >
            <Play className="w-7 h-7 fill-current" />
            <span>ابدأ اللعب الآن</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenGarage();
            }}
            className="px-8 py-4 rounded-2xl font-bold text-base bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 shadow-xl flex items-center gap-2.5 cursor-pointer transition-all"
          >
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>الكراج والترقيات</span>
          </button>
        </div>
      </div>

      {/* BOTTOM FOOTER: Flat Control Hints */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 border-t border-slate-800/80 pt-4">
        <span className="font-medium">
          الأسهم أو A/D للتحكم · Space للفرامل · Esc للإيقاف المؤقت
        </span>
        <span className="text-slate-500">
          محاكاة فيزياء كاملة 100% · عجلات ونوابض وتضاريس إجرائية
        </span>
      </div>
    </div>
  );
};
