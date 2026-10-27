/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, Pause, Play, Coins, Gauge, Flame } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface HUDProps {
  fuel: number; // 0 - 100
  speed: number; // km/h
  distance: number; // meters
  coins: number;
  highScore: number;
  biomeName: string;
  isPaused: boolean;
  soundEnabled: boolean;
  onTogglePause: () => void;
  onToggleSound: () => void;
  onThrottleChange: (value: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  fuel,
  speed,
  distance,
  coins,
  highScore,
  biomeName,
  isPaused,
  soundEnabled,
  onTogglePause,
  onToggleSound,
  onThrottleChange,
}) => {
  const isLowFuel = fuel < 25;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-20">
      {/* TOP STATUS BAR */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Distance & High Score */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2.5 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider">
              المسافة الحالية
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-num text-2xl font-black text-white tabular-nums tracking-tight">
                {distance}
              </span>
              <span className="text-xs text-sky-400 font-bold">متر</span>
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-700 mx-1" />

          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-amber-400/90">
              الرقم القياسي: {highScore} م
            </span>
            <span className="text-xs font-bold text-slate-300">
              {biomeName}
            </span>
          </div>
        </div>

        {/* Center: Low Fuel Warning Flash */}
        {isLowFuel && (
          <div className="animate-pulse bg-red-600/90 text-white font-black text-sm md:text-base px-4 py-1.5 rounded-full shadow-lg border border-red-400 flex items-center gap-2">
            <Flame className="w-5 h-5 animate-bounce" />
            <span>تحذير: وشك نفاد الوقود!</span>
          </div>
        )}

        {/* Right: Coins, Sound & Pause Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Coins counter */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-500/40 rounded-2xl px-3.5 py-2 shadow-xl">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-sm">
              <Coins className="w-4 h-4" />
            </div>
            <span className="font-num text-xl font-black text-amber-300 tabular-nums">
              {coins}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleSound();
            }}
            className="pointer-events-auto p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-xl transition-transform active:scale-95"
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-sky-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onTogglePause();
            }}
            className="pointer-events-auto p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-xl transition-transform active:scale-95"
            title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
          >
            {isPaused ? <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-5 h-5 text-slate-200" />}
          </button>
        </div>
      </div>

      {/* BOTTOM CLUSTER: GAUGES & PEDALS */}
      <div className="flex items-end justify-between gap-4">
        {/* Left Pedal: Brake / Reverse / Lean Forward */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <button
            onMouseDown={() => onThrottleChange(-1)}
            onMouseUp={() => onThrottleChange(0)}
            onMouseLeave={() => onThrottleChange(0)}
            onTouchStart={(e) => {
              e.preventDefault();
              onThrottleChange(-1);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onThrottleChange(0);
            }}
            className="group relative w-24 h-28 md:w-32 md:h-36 bg-gradient-to-t from-red-950 to-red-800 hover:from-red-900 hover:to-red-700 active:scale-95 border-2 border-red-500/80 rounded-2xl shadow-2xl flex flex-col items-center justify-between p-3 select-none transition-all cursor-pointer overflow-hidden"
          >
            {/* Pedal Grip Lines */}
            <div className="w-full flex flex-col gap-1.5 opacity-60">
              <div className="h-1 bg-red-400 rounded-full" />
              <div className="h-1 bg-red-400 rounded-full" />
              <div className="h-1 bg-red-400 rounded-full" />
            </div>

            <div className="text-center my-auto">
              <span className="block text-xl md:text-2xl font-black text-white tracking-wide">
                فرامل
              </span>
              <span className="text-[10px] md:text-xs font-bold text-red-200 uppercase tracking-widest">
                BRAKE
              </span>
            </div>

            <span className="text-[10px] bg-red-900/90 text-red-100 px-2 py-0.5 rounded font-mono">
              [ ← / A ]
            </span>
          </button>
          <span className="text-[11px] font-semibold text-slate-300 drop-shadow">
            ميل للأمام / رجوع
          </span>
        </div>

        {/* Center: Instruments Cluster (Fuel Gauge + Speedometer) */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-3xl p-3 md:p-4 shadow-2xl flex items-center gap-4 md:gap-8">
          {/* Speedometer */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-sky-400 mb-1">
              <Gauge className="w-4 h-4" />
              <span className="text-[11px] font-bold">السرعة</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-num text-3xl md:text-4xl font-black text-white tabular-nums">
                {speed}
              </span>
              <span className="text-[10px] md:text-xs text-slate-400 font-bold">كم/س</span>
            </div>
          </div>

          <div className="w-[1px] h-12 bg-slate-800" />

          {/* Fuel Level */}
          <div className="flex flex-col items-center w-28 md:w-36">
            <div className="w-full flex items-center justify-between text-[11px] font-bold mb-1">
              <span className={isLowFuel ? 'text-red-400 animate-pulse' : 'text-slate-300'}>
                الوقود
              </span>
              <span className={`font-num ${isLowFuel ? 'text-red-400 font-black' : 'text-slate-300'}`}>
                {Math.round(fuel)}%
              </span>
            </div>
            {/* Fuel Bar with segments */}
            <div className="w-full h-4 bg-slate-900 border border-slate-700 rounded-full p-0.5 overflow-hidden flex shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  fuel > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : fuel > 25
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                }`}
                style={{ width: `${Math.max(3, fuel)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Pedal: Gas / Accelerate / Lean Back */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <button
            onMouseDown={() => onThrottleChange(1)}
            onMouseUp={() => onThrottleChange(0)}
            onMouseLeave={() => onThrottleChange(0)}
            onTouchStart={(e) => {
              e.preventDefault();
              onThrottleChange(1);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onThrottleChange(0);
            }}
            className="group relative w-24 h-28 md:w-32 md:h-36 bg-gradient-to-t from-emerald-950 to-emerald-700 hover:from-emerald-900 hover:to-emerald-600 active:scale-95 border-2 border-emerald-400/80 rounded-2xl shadow-2xl flex flex-col items-center justify-between p-3 select-none transition-all cursor-pointer overflow-hidden"
          >
            {/* Pedal Grip Lines */}
            <div className="w-full flex flex-col gap-1.5 opacity-60">
              <div className="h-1 bg-emerald-300 rounded-full" />
              <div className="h-1 bg-emerald-300 rounded-full" />
              <div className="h-1 bg-emerald-300 rounded-full" />
            </div>

            <div className="text-center my-auto">
              <span className="block text-xl md:text-2xl font-black text-white tracking-wide">
                بنزين
              </span>
              <span className="text-[10px] md:text-xs font-bold text-emerald-200 uppercase tracking-widest">
                GAS
              </span>
            </div>

            <span className="text-[10px] bg-emerald-900/90 text-emerald-100 px-2 py-0.5 rounded font-mono">
              [ → / D ]
            </span>
          </button>
          <span className="text-[11px] font-semibold text-slate-300 drop-shadow">
            ميل للخلف / تسارع
          </span>
        </div>
      </div>
    </div>
  );
};
