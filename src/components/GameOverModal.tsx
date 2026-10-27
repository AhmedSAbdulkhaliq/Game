/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, Wrench, Trophy, Coins, Fuel, Flame, Award, Sparkles } from 'lucide-react';
import { GameStats } from '../types/game';
import { soundManager } from '../audio/SoundManager';

interface GameOverModalProps {
  stats: GameStats;
  totalCoins: number;
  onRetry: () => void;
  onOpenGarage: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  totalCoins,
  onRetry,
  onOpenGarage,
}) => {
  const isCrash = stats.reason === 'CRASH';

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Cause of Game Over Banner */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-white/10 bg-slate-800">
          {isCrash ? (
            <Flame className="w-8 h-8 text-rose-500 animate-bounce" />
          ) : (
            <Fuel className="w-8 h-8 text-amber-500 animate-pulse" />
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">
          {isCrash ? 'انقلاب السائق!' : 'نفد الوقود!'}
        </h2>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
          {isCrash ? 'DRIVER DOWN' : 'OUT OF FUEL'}
        </span>

        {/* New Record Banner if applicable */}
        {stats.isNewRecord && (
          <div className="w-full mb-4 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/80 rounded-2xl py-2 px-4 flex items-center justify-center gap-2 text-amber-300 font-black text-sm shadow-lg">
            <Trophy className="w-4 h-4 text-amber-400 animate-spin" />
            <span>رقم قياسي جديد! أداء رائع!</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          {/* Distance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400">المسافة المقطوعة</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-num text-3xl font-black text-white tabular-nums">
                {stats.distance}
              </span>
              <span className="text-xs text-sky-400 font-bold">متر</span>
            </div>
          </div>

          {/* Coins Earned */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400">العملات المكتسبة</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="font-num text-3xl font-black text-amber-300 tabular-nums">
                +{stats.coinsCollected}
              </span>
            </div>
          </div>

          {/* Stunts / Flips */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400">الحركات البهلوانية</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="font-num text-xl font-bold text-slate-200">
                {stats.flipsCount} شقلبة
              </span>
            </div>
          </div>

          {/* Total Bank */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400">رصيد البنك الكلي</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-num text-xl font-bold text-amber-400">
                {totalCoins}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={() => {
              soundManager.playClick();
              onRetry();
            }}
            className="w-full py-3.5 px-6 rounded-2xl font-black text-base bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            <span>إعادة المحاولة فوراً (Retry)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenGarage();
            }}
            className="w-full py-3 px-6 rounded-2xl font-bold text-sm bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Wrench className="w-4 h-4 text-sky-400" />
            <span>الكراج والترقيات (Garage)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
