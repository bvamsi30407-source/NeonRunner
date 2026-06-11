/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skin } from '../types';
import { SKINS } from '../data/skins';
import { Coins, Check, Lock, Sparkles, UserCheck } from 'lucide-react';

interface SkinShopProps {
  shardsCount: number;
  unlockedSkinIds: string[];
  activeSkin: Skin;
  onUnlockSkin: (id: string, cost: number) => void;
  onSelectSkin: (skin: Skin) => void;
}

export const SkinShop: React.FC<SkinShopProps> = ({
  shardsCount,
  unlockedSkinIds,
  activeSkin,
  onUnlockSkin,
  onSelectSkin
}) => {
  return (
    <div className="w-full bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl shadow-purple-500/10" id="skin-shop-box">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-purple-500/20 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
            NEON CORE COGNITION
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">CUSTOMIZE YOUR RETRO AVATAR PULSE MATRIX</p>
        </div>

        {/* Current Available Shard Balance */}
        <div className="flex items-center gap-2 bg-purple-950/60 border border-purple-500/40 rounded-full py-1.5 px-4 shadow-inner" id="shard-wallet-status">
          <Coins className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-mono font-bold text-cyan-300">{shardsCount} SHARDS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1" id="skins-grid-container">
        {SKINS.map((skin) => {
          const isUnlocked = unlockedSkinIds.includes(skin.id);
          const isActive = activeSkin.id === skin.id;
          const isAffordable = shardsCount >= skin.cost;

          return (
            <div
              key={skin.id}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 ${
                isActive
                  ? 'bg-purple-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.15)]'
                  : 'bg-slate-950/60 border-purple-900/30 hover:border-purple-500/40 hover:bg-slate-900/80'
              }`}
              id={`skin-item-${skin.id}`}
            >
              {/* Top Row: Preview and Name */}
              <div className="flex items-start gap-3">
                {/* Visual Glow Core Preview Box */}
                <div 
                  className="w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden" 
                  style={{ backgroundColor: '#050510' }}
                >
                  <div
                    className="w-6 h-6 rounded animate-spin shadow-lg"
                    style={{
                      background: skin.id === 'chroma_spectrum' 
                        ? 'linear-gradient(45deg, #00ffff, #ff00ff, #39ff14)' 
                        : skin.color,
                      boxShadow: `0 0 16px ${skin.color}`
                    }}
                  />
                  {/* Subtle Grid dots inside preview */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-slate-950/80 pointer-events-none" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans font-bold text-sm text-white truncate">{skin.name}</h3>
                    {isActive && (
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] px-1.5 py-0.5 rounded uppercase font-mono tracking-widest">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {skin.description}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Purchase Action Button */}
              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-purple-500/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Trail: <span className="text-slate-300 font-semibold">{skin.trailType}</span>
                </span>

                {isUnlocked ? (
                  isActive ? (
                    <button
                      className="flex items-center gap-1 px-3 py-1 bg-cyan-900/40 border border-cyan-400/40 text-cyan-300 rounded-lg text-xs font-mono font-bold cursor-default"
                      disabled
                      id={`select-btn-${skin.id}`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      ACTIVE
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectSkin(skin)}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 rounded-lg text-xs font-mono font-bold transition-all duration-250 cursor-pointer"
                      id={`select-btn-${skin.id}`}
                    >
                      SELECT
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => onUnlockSkin(skin.id, skin.cost)}
                    disabled={!isAffordable}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-250 ${
                      isAffordable
                        ? 'bg-pink-600 hover:bg-pink-500 hover:shadow-[0_0_12px_rgba(236,72,153,0.3)] text-white cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                    }`}
                    id={`unlock-btn-${skin.id}`}
                  >
                    <Lock className="w-3 h-3" />
                    UNLOCK {skin.cost}
                    <Coins className="w-3.5 h-3.5 text-cyan-400 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
