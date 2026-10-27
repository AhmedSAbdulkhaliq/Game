/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Coins,
  Gauge,
  Zap,
  Wrench,
  Fuel,
  Play,
  Lock,
  Check,
  ChevronRight,
  ShieldAlert,
  Globe2,
} from 'lucide-react';
import { BiomeId, PlayerProfile, VehicleId, VehicleUpgrades } from '../types/game';
import { BIOMES, VEHICLES, getUpgradeCost } from '../config/gameData';
import { soundManager } from '../audio/SoundManager';

interface GarageModalProps {
  profile: PlayerProfile;
  onSelectVehicle: (id: VehicleId) => void;
  onSelectBiome: (id: BiomeId) => void;
  onUnlockVehicle: (id: VehicleId) => void;
  onUpgradePart: (part: keyof VehicleUpgrades) => void;
  onStartGame: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  profile,
  onSelectVehicle,
  onSelectBiome,
  onUnlockVehicle,
  onUpgradePart,
  onStartGame,
}) => {
  const currentVehicle = VEHICLES[profile.selectedVehicle];
  const currentBiome = BIOMES[profile.selectedBiome];
  const vehicleUpgrades = profile.upgrades[profile.selectedVehicle];

  const isVehicleUnlocked = profile.unlockedVehicles.includes(profile.selectedVehicle);

  const upgradeItems: {
    key: keyof VehicleUpgrades;
    name: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: 'engine',
      name: 'المحرك (Engine)',
      desc: 'يزيد قوة العزم والدفع والتسارع على التلال الحادة',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      color: 'amber',
    },
    {
      key: 'tires',
      name: 'الإطارات (Tires)',
      desc: 'يحسن التماسك والاحتكاك ويمنع انزلاق العجلات',
      icon: <Gauge className="w-5 h-5 text-emerald-400" />,
      color: 'emerald',
    },
    {
      key: 'suspension',
      name: 'التعليق (Suspension)',
      desc: 'يمتص الصدمات العنيفة ويمنح السيارة ثباتاً فائقاً',
      icon: <Wrench className="w-5 h-5 text-sky-400" />,
      color: 'sky',
    },
    {
      key: 'fuel',
      name: 'خزان الوقود (Fuel Tank)',
      desc: 'يزيد سعة الخزان ويخفض معدل الاستهلاك بمرور الوقت',
      icon: <Fuel className="w-5 h-5 text-rose-400" />,
      color: 'rose',
    },
  ];

  return (
    <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 overflow-y-auto">
      {/* HEADER: Title & Coins Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>الكراج والترقيات</span>
            <span className="text-xs text-amber-400 font-bold bg-amber-950/80 border border-amber-600/50 px-2.5 py-1 rounded-lg">
              GARAGE
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            طوّر سيارتك بالعملات المجمعة واختر البيئة للوصول إلى أقصى مسافة ممكنة!
          </p>
        </div>

        {/* Coins Balance */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/50 rounded-2xl px-4 py-2 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 shadow-md">
            <Coins className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              رصيدك الحالي
            </span>
            <span className="font-num text-2xl font-black text-amber-300 tabular-nums">
              {profile.coins}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN BODY: VEHICLE SELECTOR & UPGRADES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1">
        {/* LEFT COLUMN: VEHICLES & STAGES (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 1. Vehicle Selection Carousel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <span>اختر المركبة</span>
              <span className="text-xs text-slate-500 font-normal">({Object.keys(VEHICLES).length} متوفرة)</span>
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(VEHICLES) as VehicleId[]).map((vid) => {
                const veh = VEHICLES[vid];
                const isUnlocked = profile.unlockedVehicles.includes(vid);
                const isSelected = profile.selectedVehicle === vid;

                return (
                  <button
                    key={vid}
                    onClick={() => {
                      soundManager.playClick();
                      onSelectVehicle(vid);
                    }}
                    className={`relative p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-400 shadow-md shadow-sky-950'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    {!isUnlocked && (
                      <div className="absolute top-2 right-2 text-amber-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isSelected && isUnlocked && (
                      <div className="absolute top-2 right-2 text-sky-400">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    {/* Color vehicle circle */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner border border-white/20 mt-1"
                      style={{ backgroundColor: veh.color }}
                    >
                      <span className="text-xs font-black text-white">{veh.nameEn.slice(0, 2)}</span>
                    </div>

                    <span className="text-xs font-bold text-center text-slate-200 line-clamp-1">
                      {veh.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Selected Vehicle Showcase Box */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-base text-white">{currentVehicle.name}</span>
                {!isVehicleUnlocked ? (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onUnlockVehicle(currentVehicle.id);
                    }}
                    disabled={profile.coins < currentVehicle.cost}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                      profile.coins >= currentVehicle.cost
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>فتح بـ {currentVehicle.cost} عملة</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> جاهزة للقيادة
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentVehicle.description}
              </p>
            </div>
          </div>

          {/* 2. Biome Stage Selection */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-sky-400" />
              <span>اختر البيئة والتضاريس</span>
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(BIOMES) as BiomeId[]).map((bid) => {
                const b = BIOMES[bid];
                const isSelected = profile.selectedBiome === bid;
                const record = profile.highScores[bid] || 0;

                return (
                  <button
                    key={bid}
                    onClick={() => {
                      soundManager.playClick();
                      onSelectBiome(bid);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-sky-400 shadow-md ring-1 ring-sky-400'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded-lg mb-1 shadow-inner border border-white/10"
                      style={{
                        background: `linear-gradient(to bottom, ${b.skyColors[0]}, ${b.groundSurfaceColor})`,
                      }}
                    />
                    <span className="text-xs font-bold text-slate-200">{b.name}</span>
                    <span className="text-[10px] text-amber-400/90 font-mono">
                      رقمك: {record}م
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 mt-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              {currentBiome.description}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: UPGRADES STORE (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>ترقيات الأداء لـ {currentVehicle.name}</span>
              </h2>
              <span className="text-xs text-slate-400">الحد الأقصى لكل قطعة: مستوى 10</span>
            </div>

            {/* Upgrade Items Grid */}
            <div className="flex flex-col gap-3">
              {upgradeItems.map((item) => {
                const currentLevel = vehicleUpgrades[item.key];
                const cost = getUpgradeCost(currentLevel);
                const isMax = currentLevel >= 10;
                const canAfford = profile.coins >= cost;

                return (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-4 transition-all"
                  >
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        {item.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{item.name}</span>
                          <span className="font-num text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                            مستوى {currentLevel}/10
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate">{item.desc}</span>

                        {/* Visual Pips Level Bar */}
                        <div className="flex items-center gap-1 mt-1.5">
                          {Array.from({ length: 10 }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 w-3 rounded-sm transition-colors ${
                                idx < currentLevel ? 'bg-sky-400 shadow-sm' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Purchase Button */}
                    <div className="shrink-0">
                      {isMax ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> مكتمل
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (canAfford) {
                              onUpgradePart(item.key);
                            }
                          }}
                          disabled={!canAfford}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-md shadow-amber-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>ترقية ({cost})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Notice if vehicle locked */}
          {!isVehicleUnlocked && (
            <div className="mt-4 p-3 bg-amber-950/50 border border-amber-600/50 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                هذه المركبة مغلقة حالياً. قم بفتحها أولاً بالعملات الذهبية لتتمكن من اللعب بها وتفعيل ترقياتها!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER: START BUTTON */}
      <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="hidden sm:inline">تحكم الحاسوب: [ الأسهم أو A / D للفرامل والتسارع ]</span>
          <span>[ Space للفرامل اليدوية ]</span>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onStartGame();
          }}
          disabled={!isVehicleUnlocked}
          className={`px-8 py-3.5 rounded-2xl font-black text-base md:text-lg flex items-center gap-3 shadow-2xl transition-all cursor-pointer ${
            isVehicleUnlocked
              ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-emerald-950'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-6 h-6 fill-current" />
          <span>انطلاق وبدء القيادة! (START)</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
