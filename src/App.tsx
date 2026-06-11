/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GameStateObj, Skin } from './types';
import { SKINS } from './data/skins';
import { NeonRunnerCanvas } from './components/NeonRunnerCanvas';
import { SkinShop } from './components/SkinShop';
import { soundManager } from './utils/audio';

// Lucide Icons Import
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Trophy,
  Coins,
  Gamepad2,
  Zap,
  Sparkles,
  ShieldCheck,
  HeartCrack,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// Safe sandbox-compatible localStorage helpers
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }
};

export default function App() {
  // Game state controls
  const [gameState, setGameState] = useState<GameStateObj>('MENU');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [runShardsGained, setRunShardsGained] = useState<number>(0);

  // Persistent user stats state
  const [highScore, setHighScore] = useState<number>(0);
  const [cumulativeShards, setCumulativeShards] = useState<number>(0);
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(['cyan_dynamo']);
  const [activeSkin, setActiveSkin] = useState<Skin>(SKINS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Revive state tracker (players get one revive attempt per active run)
  const [hasRevivedInRun, setHasRevivedInRun] = useState<boolean>(false);
  const [triggerRevive, setTriggerRevive] = useState<boolean>(false);

  // Speed and speed milestone indicator
  const [currentSpeed, setCurrentSpeed] = useState<number>(5.5);

  // Game over and Interstitial ad trackers
  const [gameOverCount, setGameOverCount] = useState<number>(0);
  const [isInterstitialAdPlaying, setIsInterstitialAdPlaying] = useState<boolean>(false);
  const [interstitialTimer, setInterstitialTimer] = useState<number>(5);

  // Revive Simulated ad countdown trackers
  const [isReviveAdPlaying, setIsReviveAdPlaying] = useState<boolean>(false);
  const [reviveAdTimer, setReviveAdTimer] = useState<number>(5);

  // Load persistence configurations on startup
  useEffect(() => {
    const savedHighScore = safeStorage.getItem('neon_runner_highscore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));

    const savedCumulativeShards = safeStorage.getItem('neon_runner_shards');
    if (savedCumulativeShards) setCumulativeShards(parseInt(savedCumulativeShards, 10));

    const savedUnlockedSkins = safeStorage.getItem('neon_runner_unlocked_skins');
    if (savedUnlockedSkins) {
      try {
        const parsed = JSON.parse(savedUnlockedSkins);
        if (Array.isArray(parsed)) setUnlockedSkinIds(parsed);
      } catch (_) {}
    }

    const savedActiveSkinId = safeStorage.getItem('neon_runner_active_skin');
    if (savedActiveSkinId) {
      const matched = SKINS.find((s) => s.id === savedActiveSkinId);
      if (matched) setActiveSkin(matched);
    }

    const savedMuted = safeStorage.getItem('neon_runner_muted');
    if (savedMuted) {
      const isMuteVal = savedMuted === 'true';
      setIsMuted(isMuteVal);
      soundManager.isMuted = isMuteVal;
    }

    const savedGameOverCount = safeStorage.getItem('neon_runner_gameover_count');
    if (savedGameOverCount) {
      setGameOverCount(parseInt(savedGameOverCount, 10));
    }
  }, []);

  // Interval timer for Revive Ad countdown (5s)
  useEffect(() => {
    let timerId: any = null;
    if (isReviveAdPlaying) {
      timerId = setInterval(() => {
        setReviveAdTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            setIsReviveAdPlaying(false);
            // Complete the ad revive automatically!
            handleReviveSuccess('ad');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isReviveAdPlaying]);

  // Interval timer for Interstitial Ad countdown (5s)
  useEffect(() => {
    let timerId: any = null;
    if (isInterstitialAdPlaying) {
      timerId = setInterval(() => {
        setInterstitialTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isInterstitialAdPlaying]);

  // Revive success trigger
  const handleReviveSuccess = (method: 'shards' | 'ad') => {
    if (method === 'shards') {
      // Deduct exactly 5 shards as requested
      const nextCumulative = Math.max(0, cumulativeShards - 5);
      setCumulativeShards(nextCumulative);
      safeStorage.setItem('neon_runner_shards', nextCumulative.toString());
    }

    setHasRevivedInRun(true);
    setTriggerRevive(true);
    setGameState('PLAYING');
  };

  // Update GameState transitions
  const handleStateChange = (newState: GameStateObj) => {
    if (newState === 'PLAYING' || newState === 'MENU') {
      if (gameOverCount >= 5) {
        setInterstitialTimer(5);
        setIsInterstitialAdPlaying(true);
        return;
      }
    }
    setGameState(newState);
    if (newState === 'PLAYING') {
      // Reset revive constraints on new clear game
      if (!triggerRevive) {
        setHasRevivedInRun(false);
        setRunShardsGained(0);
        setCurrentScore(0);
      }
    }
  };

  // Sound manager toggler
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMute(nextMuted);
    safeStorage.setItem('neon_runner_muted', nextMuted ? 'true' : 'false');
  };

  // Score callbacks
  const handleScoreChange = (score: number) => {
    setCurrentScore(score);
    // Realtime highscore feedback
    if (score > highScore) {
      setHighScore(score);
      safeStorage.setItem('neon_runner_highscore', score.toString());
    }
  };

  // Shards callbacks
  const handleShardCollect = (runShards: number) => {
    setRunShardsGained(runShards);
    
    // Save shard cumulative balance immediately
    const nextCumulative = cumulativeShards + 1;
    setCumulativeShards(nextCumulative);
    safeStorage.setItem('neon_runner_shards', nextCumulative.toString());
  };

  // Game over crash event
  const handleGameOver = (finalScore: number, shardsGained: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      safeStorage.setItem('neon_runner_highscore', finalScore.toString());
    }

    // Increment game over count when game is finalized on complete crash
    const nextCount = gameOverCount + 1;
    setGameOverCount(nextCount);
    safeStorage.setItem('neon_runner_gameover_count', nextCount.toString());
  };

  const handleDeclineRevive = () => {
    const nextCount = gameOverCount + 1;
    setGameOverCount(nextCount);
    safeStorage.setItem('neon_runner_gameover_count', nextCount.toString());

    // Check highscore immediately
    if (currentScore > highScore) {
      setHighScore(currentScore);
      safeStorage.setItem('neon_runner_highscore', currentScore.toString());
    }

    if (nextCount >= 5) {
      setInterstitialTimer(5);
      setIsInterstitialAdPlaying(true);
    } else {
      setGameState('GAMEOVER');
    }
  };

  // Spend shards to unlock custom neon trail colors
  const handleUnlockSkin = (skinId: string, cost: number) => {
    if (unlockedSkinIds.includes(skinId)) return;
    if (cumulativeShards < cost) return;

    const nextCumulative = cumulativeShards - cost;
    setCumulativeShards(nextCumulative);
    safeStorage.setItem('neon_runner_shards', nextCumulative.toString());

    const nextUnlockedList = [...unlockedSkinIds, skinId];
    setUnlockedSkinIds(nextUnlockedList);
    safeStorage.setItem('neon_runner_unlocked_skins', JSON.stringify(nextUnlockedList));

    // Automatically select the newly unlocked cosmetic
    const chosenSkin = SKINS.find((s) => s.id === skinId);
    if (chosenSkin) {
      setActiveSkin(chosenSkin);
      safeStorage.setItem('neon_runner_active_skin', chosenSkin.id);
    }
  };

  const handleSelectSkin = (skin: Skin) => {
    if (!unlockedSkinIds.includes(skin.id)) return;
    setActiveSkin(skin);
    safeStorage.setItem('neon_runner_active_skin', skin.id);
  };

  const handleReviveComplete = () => {
    setTriggerRevive(false);
  };

  return (
    <div className="min-h-screen bg-[#050510] text-slate-100 flex flex-col font-sans relative overflow-x-hidden select-none" id="neon-app-root">
      
      {/* Dynamic Background subtle ambient meshes */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-pink-950/5 to-transparent pointer-events-none" />
      <div className="absolute -top-32 -right-40 w-96 h-96 bg-cyan-700/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-80 h-80 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Dashboard Wrapper */}
      <div className="max-w-6xl w-full mx-auto px-4 py-5 md:py-8 flex flex-col gap-5 relative z-10 flex-1 justify-center">
        
        {/* Technical Header Bar */}
        <header className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/40 border border-purple-500/10 rounded-xl px-5 py-3.5 backdrop-blur-md gap-4 shadow-lg shadow-purple-950/5" id="app-cyber-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center border border-pink-400 shadow-[0_0_12px_rgba(219,39,119,0.5)] animate-pulse">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                NEON RUNNER
                <span className="text-[10px] font-mono border border-cyan-500/30 text-cyan-400 bg-cyan-950/30 rounded py-0.5 px-1.5 uppercase tracking-widest animate-pulse">v2.4 ARCADE</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">HIGH INTEGRATED PHOTON QUANTUM PLATFORM</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                isMuted
                  ? 'bg-red-950/40 border-red-500/30 text-red-400 hover:bg-slate-800'
                  : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/60'
              }`}
              id="mute-control-toggle"
              title={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Game Sounds'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              {isMuted ? 'MUTE_ON' : 'AUDIO_LIVE'}
            </button>

            {/* Top Score Banner */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-purple-500/20 rounded-lg px-3 py-1" id="global-highscore-banner">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div className="text-right">
                <span className="block text-[8px] text-slate-500 font-mono">GRID RECO_RECORD</span>
                <span className="text-xs font-mono font-bold text-amber-300">{highScore} PTS</span>
              </div>
            </div>
          </div>
        </header>

        {/* Responsive Layout Grid
            During PLAYING state: Sandbox goes wide screen to fill 3-cols columns for immersion.
            During MENU/GAMEOVER: Grid folds down showing side-panels (Skin Shop, Instructions). */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch" id="app-bento-grid">
          
          {/* Main Visual Runner Stage Canvas Area */}
          <div className={`flex flex-col gap-4 transition-all duration-500 ${
            gameState === 'PLAYING' || gameState === 'REVIVING' ? 'lg:col-span-3' : 'lg:col-span-2'
          }`} id="runner-canvas-panel-parent">
            
            <div className="relative w-full h-[400px] md:h-[440px] bg-slate-950 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/20 overflow-hidden flex flex-col" id="runner-stage-box">
              
              {/* Core Gaming Canvas Container */}
              <div className="flex-1 w-full relative">
                <NeonRunnerCanvas
                  gameState={gameState}
                  activeSkin={activeSkin}
                  isMuted={isMuted}
                  onScoreChange={handleScoreChange}
                  onShardCollect={handleShardCollect}
                  onGameOver={handleGameOver}
                  onStateChange={handleStateChange}
                  triggerRevive={triggerRevive}
                  onReviveComplete={handleReviveComplete}
                  hasRevivedInRun={hasRevivedInRun}
                />

                {/* GAME PLAY HUD INNER INJECTION OVERLAY */}
                {(gameState === 'PLAYING' || gameState === 'REVIVING') && (
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none" id="gamelay-runtime-hud">
                    {/* Live score */}
                    <div className="bg-slate-950/85 border border-cyan-500/40 rounded-lg py-1 px-3 backdrop-blur shadow-md">
                      <span className="text-[9px] font-mono text-slate-400 block tracking-wider uppercase">Grid Sync Score</span>
                      <span className="text-sm font-mono font-bold text-cyan-300 tracking-wider animate-pulse">{currentScore} PTS</span>
                    </div>

                    {/* Active Skin Badge */}
                    <div className="hidden sm:flex items-center gap-1 bg-slate-950/80 border border-purple-500/30 rounded-full py-0.5 px-3 backdrop-blur text-[10px]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeSkin.color }} />
                      <span className="font-mono text-slate-300 font-semibold uppercase">{activeSkin.name}</span>
                    </div>

                    {/* Shards earned this run */}
                    <div className="bg-slate-950/85 border border-pink-500/40 rounded-lg py-1 px-3 backdrop-blur shadow-md flex items-center gap-2">
                      <Coins className="w-4 h-4 text-pink-400 animate-spin" />
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-slate-400 block uppercase">SHARDS_GAIN</span>
                        <span className="text-sm font-mono font-bold text-pink-300">+{runShardsGained}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MENU STATE OVERLAY (Visible on Lobby Menu Standby) */}
                {gameState === 'MENU' && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col justify-center items-center px-6 py-8 text-center" id="menu-standby-overlay">
                    {/* Retro launcher graphic */}
                    <div className="relative mb-4">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 blur opacity-40 animate-pulse" />
                      <div className="relative w-14 h-14 rounded-full bg-slate-900 border border-purple-500/50 flex items-center justify-center">
                        <Play className="w-6 h-6 text-cyan-400 ml-1 hover:scale-110 transition-transform cursor-pointer" onClick={() => handleStateChange('PLAYING')} />
                      </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-sans font-black tracking-tighter text-white neon-glow-pink">
                      CYBERSPACE RUNNER
                    </h2>
                    <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mt-1">A HIGH SPEED PHOTON DENSITY MATRIX CHASE</p>

                    <div className="max-w-md bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 my-6 text-left shadow-lg">
                      <div className="flex items-center gap-1.5 mb-2 font-mono text-xs font-bold text-pink-400">
                        <Zap className="w-3.5 h-3.5" />
                        MANAGE NEON PULSER CONTROLS:
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        Tap anywhere on the gray visual zone or press your <strong className="text-cyan-300">Spacebar</strong> / <strong className="text-cyan-300">ArrowUp</strong> key to jump.
                      </p>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed font-mono">
                        Perform a <strong className="text-pink-300">Double Jump</strong> by tapping again while airborne to glide past tall laser fences. Speed accelerates over time!
                      </p>
                    </div>

                    <button
                      onClick={() => handleStateChange('PLAYING')}
                      className="group flex items-center gap-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold tracking-wider px-8 py-3.5 rounded-xl border-t border-pink-400/40 shadow-2xl hover:shadow-pink-500/30 group-hover:scale-102 transform duration-200 cursor-pointer uppercase text-sm font-sans"
                      id="launch-runner-button"
                    >
                      LAUNCH RUNNER
                      <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
                    </button>
                    
                    <span className="text-[9px] text-slate-500 font-mono mt-4 uppercase">click above to resume audio engine context</span>
                  </div>
                )}

                {/* GAME OVER STATE OVERLAY */}
                {gameState === 'GAMEOVER' && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col justify-center items-center px-6 text-center" id="gameover-overlay">
                    
                    <div className="text-pink-500 mb-2 border border-pink-500/30 bg-pink-950/20 rounded-full px-4 py-1 flex items-center gap-2 text-xs font-mono tracking-widest animate-pulse">
                      <HeartCrack className="w-4 h-4 animate-bounce" />
                      MATRIX DISRUPTED! PLAYER CRASHED
                    </div>

                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
                      SYSTEM OVERLOADED
                    </h2>
                    <p className="text-xs text-slate-400 font-mono uppercase tracking-widest mt-0.5">METADATA SYNC DEACTIVATED</p>

                    {/* Stats summary board */}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm my-6 bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
                      <div className="text-center p-2 rounded bg-slate-950/40 border border-purple-900/10">
                        <span className="text-[9px] text-slate-500 font-mono block uppercase">SCORE_RESULT</span>
                        <span className="text-base font-mono font-bold text-cyan-300">{currentScore} PTS</span>
                      </div>
                      
                      <div className="text-center p-2 rounded bg-slate-950/40 border border-purple-900/10 flex flex-col items-center justify-center">
                        <span className="text-[9px] text-slate-500 font-mono block uppercase">SHARDS_SECURED</span>
                        <div className="flex items-center gap-1 text-pink-300 font-mono font-bold text-base select-none">
                          <Coins className="w-3.5 h-3.5 text-pink-400" />
                          +{runShardsGained}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 items-stretch w-full max-w-sm justify-center" id="gameover-menu-actions">
                      {/* STANDARD RETRY FROM INITIAL START BUTTON */}
                      <button
                        onClick={() => handleStateChange('PLAYING')}
                        className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-pink-500/20 border-t border-pink-400/30 transition-all cursor-pointer text-xs uppercase font-mono tracking-wider"
                        id="retry-game-action-btn"
                      >
                        <RotateCcw className="w-4 h-4 text-white" />
                        RE-BOOT CODE (G_RETRY)
                      </button>

                      <button
                        onClick={() => handleStateChange('MENU')}
                        className="text-[10px] font-mono text-slate-500 hover:text-slate-300 mt-2 uppercase tracking-widest underline decoration-dotted transition-colors cursor-pointer"
                        id="exit-to-terminal-btn"
                      >
                        EXIT TO LOBBY TERMINAL
                      </button>
                    </div>
                  </div>
                )}

                {/* RECONSTRUCT AVATAR / REVIVE SELECTION OVERLAY */}
                {gameState === 'REVIVING' && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center px-6 text-center z-30" id="revive-reconstruct-overlay">
                    
                    {isReviveAdPlaying ? (
                      /* SIMULATED AD LOADING DECK */
                      <div className="flex flex-col items-center max-w-md w-full bg-slate-900/95 border border-pink-500/40 rounded-2xl p-8 shadow-2xl shadow-pink-500/15" id="ad-loader-deck">
                        <div className="relative w-12 h-12 bg-pink-950/20 rounded-full flex items-center justify-center border border-pink-500/30 mb-4 animate-bounce">
                          <Play className="w-5 h-5 text-pink-400 animate-pulse ml-0.5" />
                        </div>
                        <h3 className="text-sm font-mono uppercase text-pink-400 font-bold tracking-wider animate-pulse">
                          LOADING SPONSOR TRANSMISSION...
                        </h3>
                        <p className="text-base font-mono text-white font-extrabold tracking-tight mt-2" id="simulated-ad-timer-text">
                          [Simulated Video Ad Playing: {reviveAdTimer}s remaining]
                        </p>

                        {/* Progress Bar container */}
                        <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-3 mt-6 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(236,72,153,0.7)]" 
                            style={{ width: `${(5 - reviveAdTimer) * 20}%` }}
                          />
                        </div>
                        
                        <span className="text-[9px] font-mono text-slate-500 uppercase mt-4 block">STREAMING OPTIMIZED SYSTEM BACKUP DATA</span>
                      </div>
                    ) : (
                      /* OPTION SELECTION OVERLAY */
                      <div className="flex flex-col items-center bg-slate-900/95 border-2 border-pink-500 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl shadow-pink-950/40 relative" id="reconstruct-avatar-popup">
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-pink-950/40 border border-pink-500/30 text-pink-400 rounded-lg px-2.5 py-1 text-[9px] font-mono font-bold uppercase animate-pulse">
                          CRCH: 1 / GAME: {gameOverCount}
                        </div>

                        <div className="text-cyan-400 text-[10px] font-mono tracking-widest uppercase border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 rounded-full mb-3 mt-2 animate-pulse">
                          CHASSIS SYNC INTERRUPTED
                        </div>

                        <h3 className="text-xl md:text-2xl font-black tracking-tighter text-white mb-1 uppercase">
                          RECONSTRUCT AVATAR?
                        </h3>
                        <p className="text-xs text-slate-300 font-mono mb-4 px-2 tracking-tight">
                          Spend <span className="text-cyan-400 font-bold">5 Shards</span> or <span className="text-pink-400 font-bold">Watch a Dev Feed</span> to keep your score of
                        </p>

                        <div className="bg-slate-950/80 border border-purple-500/20 rounded-xl px-6 py-2 mb-6">
                          <span className="text-[9px] font-mono text-slate-500 block uppercase">CURRENT SCORE</span>
                          <span className="text-xl font-mono font-black text-yellow-400 tracking-wider text-glow-yellow">{currentScore} PTS</span>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                          
                          {/* OPTION 1: Spend 5 Shards */}
                          <button
                            onClick={() => handleReviveSuccess('shards')}
                            disabled={cumulativeShards < 5}
                            className={`flex items-center justify-between px-5 py-3.5 rounded-xl border font-mono font-bold transition-all text-xs cursor-pointer ${
                              cumulativeShards >= 5
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950 hover:bg-cyan-400 shadow-lg hover:shadow-cyan-400/20 hover:scale-[1.01]'
                                : 'bg-slate-950/30 border-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                            id="spend-shards-revive-btn"
                          >
                            <span className="flex items-center gap-2 uppercase">
                              <Coins className="w-4 h-4" />
                              Spend 5 Shards
                            </span>
                            <span className="text-[10px] border px-1.5 py-0.5 rounded border-slate-800 bg-slate-900/60">
                              BAL: {cumulativeShards}
                            </span>
                          </button>

                          {/* OPTION 2: Watch Ad */}
                          <button
                            onClick={() => {
                              setReviveAdTimer(5);
                              setIsReviveAdPlaying(true);
                            }}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold px-5 py-3.5 rounded-xl border-t border-pink-400/30 shadow-lg hover:shadow-pink-500/20 hover:scale-[1.01] transition-all cursor-pointer text-xs uppercase"
                            id="watch-dev-feed-btn"
                          >
                            <Play className="w-4 h-4 text-white animate-pulse" />
                            Watch a Dev Feed
                          </button>

                          {/* OPTION 3: Decline */}
                          <button
                            onClick={handleDeclineRevive}
                            className="text-[10px] uppercase font-mono font-bold text-slate-500 hover:text-red-400 transition-colors mt-2 tracking-widest cursor-pointer hover:underline"
                            id="decline-revive-btn"
                          >
                            No thanks, End Game
                          </button>

                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Side customization panel - Only visible on Lobby menus or GameOver view to leverage desktop real estate */}
          {(gameState === 'MENU' || gameState === 'GAMEOVER') && (
            <aside className="lg:col-span-1 flex flex-col gap-4" id="custom-right-aside">
              
              {/* Cumulative stats card */}
              <div className="bg-[#0c0c1b]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md shadow-lg" id="pilot-profile-meta">
                <div className="flex items-center gap-2 mb-3 border-b border-purple-500/10 pb-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase font-bold text-slate-300 tracking-wider">PILOT CORE METADATA</span>
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center bg-slate-950/40 py-1.5 px-3 rounded border border-purple-950/60 text-xs text-slate-400">
                    <span className="font-mono">INTELLIGENCE MATRIX:</span>
                    <span className="font-bold text-white font-mono">{activeSkin.name}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/40 py-1.5 px-3 rounded border border-purple-950/60 text-xs text-slate-400">
                    <span className="font-mono">SYNAPTIC RECORD:</span>
                    <span className="font-bold text-yellow-400 font-mono">{highScore} PTS</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/40 py-1.5 px-3 rounded border border-purple-950/60 text-xs text-slate-400">
                    <span className="font-mono">ENERGY WALLET:</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-cyan-400">
                      <Coins className="w-3.5 h-3.5" />
                      {cumulativeShards} SHARDS
                    </div>
                  </div>
                </div>
              </div>

              {/* Skin customizable panel */}
              <SkinShop
                shardsCount={cumulativeShards}
                unlockedSkinIds={unlockedSkinIds}
                activeSkin={activeSkin}
                onUnlockSkin={handleUnlockSkin}
                onSelectSkin={handleSelectSkin}
              />
            </aside>
          )}

        </div>
      </div>

      {/* Cybernetic Footer branding */}
      <footer className="py-4 text-center border-t border-slate-900 bg-slate-950/40 relative z-10" id="arcade-credits-footer">
        <p className="text-[10px] text-slate-600 font-mono tracking-widest flex items-center justify-center gap-1 uppercase">
          [ DEEP COGNITION CYBER RETRO CONSOLE SYSTEM - POWERED BY GEMINI ]
        </p>
      </footer>

      {/* FULL-SCREEN INTERSTITIAL SPONSOR AD OVERLAY */}
      {isInterstitialAdPlaying && (
        <div className="fixed inset-0 bg-[#020208] z-[9999] flex flex-col justify-center items-center px-6 py-8 text-center" id="full-screen-interstitial-overlay">
          
          {/* Subtle moving retro scanlines background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_3px_100%] pointer-events-none" />

          <div className="max-w-md w-full bg-[#080814]/95 border-2 border-cyan-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.35)] flex flex-col items-center relative overflow-hidden">
            
            {/* Corner retro-tech brackets */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

            <div className="w-16 h-16 bg-cyan-950/40 border border-cyan-500/50 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-widest text-cyan-400 font-mono animate-pulse uppercase">
              LOADING SPONSOR TRANSMISSION...
            </h2>

            <div className="bg-slate-950/80 border border-cyan-500/20 rounded-2xl px-6 py-4 my-6 w-full shadow-inner">
              <p className="text-lg md:text-xl font-mono text-white font-black tracking-tight" id="interstitial-countdown-display">
                [Simulated Video Ad Playing: {interstitialTimer}s remaining]
              </p>
              
              {/* Fake Premium Retro Advertisement */}
              <div className="mt-4 border-t border-cyan-950/30 pt-3 text-left">
                <span className="text-[8px] font-mono text-cyan-500 block uppercase tracking-wider">RETRO-AD DATA STREAM</span>
                <p className="text-xs font-mono text-slate-300 mt-1 italic uppercase leading-tight">
                  "GET ULTRA-CHARGED CYBER GLOW DRINK. FUEL YOUR QUANTUM LIGHT SPEED RUN!"
                </p>
              </div>
            </div>

            {/* Progress countdown indicator */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-3 overflow-hidden select-none mb-6">
              <div 
                className="bg-cyan-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                style={{ width: `${(5 - interstitialTimer) * 20}%` }}
              />
            </div>

            {/* Close Button shown only when countdown is 0 */}
            {interstitialTimer === 0 ? (
              <button
                onClick={() => {
                  setGameOverCount(0);
                  safeStorage.setItem('neon_runner_gameover_count', '0');
                  setIsInterstitialAdPlaying(false);
                  setGameState('MENU');
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black tracking-widest uppercase font-mono py-4 px-6 rounded-2xl border-t border-white/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer hover:scale-[1.02] text-sm animate-pulse"
                id="close-sponsor-ad-btn"
              >
                Close Ad
              </button>
            ) : (
              <div className="w-full bg-slate-950/80 border border-slate-900 rounded-2xl font-mono text-slate-500 text-[10px] px-6 py-3.5 select-none uppercase tracking-wider">
                SATELLITE SIGNAL OPTIMIZING... {interstitialTimer}S
              </div>
            )}

            <p className="text-[8px] font-mono text-slate-600 mt-6 uppercase leading-none tracking-widest">TRANSMISSION ENCRYPTED VIA G-SYNC PROTOCOLS</p>
          </div>
        </div>
      )}
    </div>
  );
}
