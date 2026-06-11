/**
 * Cyberspace Runner - Standalone Retro Arcade Game Engine
 * Features: Pure Web Audio Synthesis, Canvas Game Loop, Local Storage Shop.
 */

// ==========================================
// 1. ENGINE START
// ==========================================


// ==========================================
// 2. PROCEDURAL SOUND SYNTHESIZER (WEB AUDIO API)
// ==========================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmIntervalId = null;
    this.bgmStep = 0;
    this.synthTempo = 240; // BPM
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn('Procedural Audio Engine failed to load, running silent:', e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    // Update visual storage preference
    safeStorage.setItem('neon_runner_muted', String(muted));
    
    if (muted) {
      this.stopBGM();
    } else {
      this.resume();
      this.startBGM();
    }
  }

  createOscillator(type, freqStart, freqEnd, duration, gainStart) {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() {
    this.createOscillator('triangle', 180, 520, 0.16, 0.15);
  }

  playDoubleJump() {
    this.createOscillator('triangle', 350, 780, 0.18, 0.15);
  }

  playShard() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const time = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, time);
    gain1.gain.setValueAtTime(0.1, time);
    gain1.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(time);
    osc1.stop(time + 0.1);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318, time + 0.06);
    gain2.gain.setValueAtTime(0.08, time + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(time + 0.06);
    osc2.stop(time + 0.2);
  }

  playExplosion() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const time = this.ctx.currentTime;
    const duration = 0.6;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, time);
    subOsc.frequency.exponentialRampToValueAtTime(10, time + duration);
    subGain.gain.setValueAtTime(0.25, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.linearRampToValueAtTime(50, time + duration);

    subOsc.connect(filter);
    filter.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(time);
    subOsc.stop(time + duration);
  }

  playSpeedUp() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, time);
    osc.frequency.setValueAtTime(440, time + 0.08);
    osc.frequency.setValueAtTime(550, time + 0.16);
    osc.frequency.exponentialRampToValueAtTime(1100, time + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  startBGM() {
    if (this.isMuted) return;
    this.init();
    this.resume();
    if (this.bgmIntervalId) return;

    const intervalMs = (60 / this.synthTempo) * 1000;
    const BassMelody = [
      110.0, 110.0, 130.8, 110.0,
      146.8, 146.8, 164.8, 146.8,
      98.0,  98.0,  110.0, 98.0,
      82.4,  82.4,  98.0,  82.4
    ];

    this.bgmIntervalId = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      if (this.ctx.state === 'suspended') return;

      const time = this.ctx.currentTime;
      const step = this.bgmStep % BassMelody.length;
      const frequency = BassMelody[step];

      // Procedural Bass Loop on alternate steps
      if (this.bgmStep % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const lowpass = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, time);

        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(250, time);

        gainNode.gain.setValueAtTime(0.12, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        osc.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.25);
      }

      // Procedural soft hi-hat sizzle
      if (this.bgmStep % 4 === 2) {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(8000, time);
        
        gainNode.gain.setValueAtTime(0.015, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.06);
      }

      this.bgmStep++;
    }, intervalMs);
  }

  stopBGM() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }
}

const soundManager = new SoundManager();


// ==========================================
// 3. PERSISTENT LOCAL STORAGE WRAPPERS
// ==========================================

const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }
};


// ==========================================
// 4. SKINS CATALOG DEFINITIONS
// ==========================================

const SKINS = [
  {
    id: 'cyan_dynamo',
    name: 'Cyan Dynamo',
    color: '#00ffff',
    secondaryColor: '#008b8b',
    glowColor: 'rgba(0, 255, 255, 0.8)',
    cost: 0,
    trailType: 'smooth',
    description: 'The standard issue cybernetic pulse. Smooth and reliable.'
  },
  {
    id: 'orchid_surge',
    name: 'Orchid Surge',
    color: '#ff007f',
    secondaryColor: '#c71585',
    glowColor: 'rgba(255, 0, 127, 0.8)',
    cost: 15,
    trailType: 'smoke',
    description: 'An aggressive, pink shockwave. Sizzles in motion.'
  },
  {
    id: 'acid_overload',
    name: 'Acid Overload',
    color: '#39ff14',
    secondaryColor: '#006400',
    glowColor: 'rgba(57, 255, 20, 0.8)',
    cost: 30,
    trailType: 'sparkles',
    description: 'Highly volatile bio-luminescent neon sludge.'
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    color: '#ffaa00',
    secondaryColor: '#d2691e',
    glowColor: 'rgba(255, 170, 0, 0.8)',
    cost: 50,
    trailType: 'smooth',
    description: 'Harvested directly from thermonuclear solar winds.'
  },
  {
    id: 'chroma_spectrum',
    name: 'Chroma Horizon',
    color: '#ff00ff', // Cycle color dynamically
    secondaryColor: '#00ffff',
    glowColor: 'rgba(255, 255, 255, 0.9)',
    cost: 100,
    trailType: 'rainbow',
    description: 'A legendary masterwork that bends light wavelengths.'
  }
];


// ==========================================
// 5. CORE GAME STATE MANAGEMENT & VARIABLES
// ==========================================

// Global state controller: 'MENU' | 'PLAYING' | 'GAMEOVER' | 'SUSPENDED'
let currentGameState = 'MENU';

// User high scores & shards balance
let highScoreValue = 0;
let totalShardsCollected = 0;
let unlockedSkinIds = ['cyan_dynamo'];
let activeSkin = SKINS[0];

// Running session stats
let runScore = 0;
let runShardsGained = 0;
let runSpeed = 5.5;
let routeMilestoneDistance = 0;
let totalFramesTracked = 0;
let gameMuted = false;

// Ad frequency counter
let countGameOverRuns = 0;

// Revive state tracker (prevents infinite free reviews per active simulation run)
let hasRevivedInCurrentRun = false;

// Simulated Timer IDs
let adTrackerTimerId = null;

// Virtual metrics resolution canvas scales
const V_WIDTH = 800;
const V_HEIGHT = 400;
const GROUND_Y = 320;
const GRAVITY = 0.52;
const JUMP_FORCE = -11.0;
const DOUBLE_JUMP_FORCE = -9.2;
const PLAYER_X = 120;

// Physics Entities Refs
let player = {
  y: GROUND_Y - 32,
  vy: 0,
  width: 30,
  height: 30,
  isGrounded: true,
  jumpCount: 0,
  rotation: 0
};

let obstacles = [];
let shards = [];
let particles = [];
let floatingTexts = [];
let invincibilityTimer = 0; // Shield frames list after revives
let chromaHue = 0; // Color cycle tracker for Chroma Spectrum skin

let canvas, ctx;
let lastTime = 0;


// ==========================================
// 6. INITIALIZATION & BINDERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize canvas layouts
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  // Set accurate rendering dimensions
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Load local saved scores
  loadUserData();
  
  // Parse HTML vectors & menus
  initDOMListeners();
  
  // Build items inside the shop
  populateSkinsGrid();
  
  // Render high scores inside displays
  refreshStatsUI();

  // Draw initial static menu placeholder
  drawStaticLobbyFrame();

  // Render initial static Lucide Icons vectors
  lucide.createIcons();
});

function resizeCanvas() {
  const container = document.getElementById('game-container');
  if (!container || !canvas) return;
  
  // Keep perfect 2:1 logical canvas layout bounds scaled automatically to desktop frames
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  canvas.width = V_WIDTH;
  canvas.height = V_HEIGHT;
}

function loadUserData() {
  const score = safeStorage.getItem('neon_runner_highscore');
  if (score) highScoreValue = parseInt(score, 10);

  const shardsBal = safeStorage.getItem('neon_runner_shards');
  if (shardsBal) totalShardsCollected = parseInt(shardsBal, 10);

  const skinsListStr = safeStorage.getItem('neon_runner_unlocked_skins');
  if (skinsListStr) {
    try {
      const parsedSkins = JSON.parse(skinsListStr);
      if (Array.isArray(parsedSkins)) unlockedSkinIds = parsedSkins;
    } catch (_) {}
  }

  const activeSkinId = safeStorage.getItem('neon_runner_active_skin');
  if (activeSkinId) {
    const matched = SKINS.find(s => s.id === activeSkinId);
    if (matched) activeSkin = matched;
  }

  const mutePreference = safeStorage.getItem('neon_runner_muted');
  if (mutePreference) {
    gameMuted = (mutePreference === 'true');
    soundManager.isMuted = gameMuted;
    updateMutedIconState();
  }
}

function refreshStatsUI() {
  // Menu displays
  document.getElementById('menu-highscore-val').textContent = `${highScoreValue} PTS`;
  document.getElementById('menu-shards-val').textContent = totalShardsCollected;
  
  // HUD Displays
  document.getElementById('hud-score-value').textContent = String(Math.floor(runScore)).padStart(6, '0');
  document.getElementById('hud-shards-value').textContent = String(runShardsGained).padStart(2, '0');
  
  // Revive details
  document.getElementById('revive-shards-badge').textContent = `BAL: ${totalShardsCollected}`;
  
  // Shop details
  document.getElementById('shop-shards-val').textContent = `${totalShardsCollected} SHARDS`;
}

function updateMutedIconState() {
  const soundBtn = document.getElementById('hud-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const menuAudioText = document.querySelector('#menu-audio-toggle span');
  const menuAudioIcon = document.querySelector('#menu-audio-toggle i');
  
  if (gameMuted) {
    if (soundIcon) soundIcon.setAttribute('data-lucide', 'volume-x');
    if (menuAudioText) menuAudioText.textContent = "SYSTEM AUDIO MUTED";
    if (menuAudioIcon) menuAudioIcon.setAttribute('data-lucide', 'volume-x');
  } else {
    if (soundIcon) soundIcon.setAttribute('data-lucide', 'volume-2');
    if (menuAudioText) menuAudioText.textContent = "SYSTEM AUDIO LIVE";
    if (menuAudioIcon) menuAudioIcon.setAttribute('data-lucide', 'volume-2');
  }
  lucide.createIcons();
}


// ==========================================
// 7. INPUT HANDLERS & NAVIGATION BINDINGS
// ==========================================

function initDOMListeners() {
  // Volume actions
  document.getElementById('hud-sound-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSoundMuted();
  });
  document.getElementById('menu-audio-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSoundMuted();
  });

  // Main menu launch
  document.getElementById('btn-start-run').addEventListener('click', () => {
    soundManager.resume();
    startRunningSession();
  });

  document.getElementById('btn-open-shop').addEventListener('click', () => {
    soundManager.resume();
    showShopMenu();
  });

  document.getElementById('btn-shop-back').addEventListener('click', () => {
    hideShopMenu();
  });

  // Revive responses
  document.getElementById('btn-spend-shards-revive').addEventListener('click', () => {
    attemptShardsRevive();
  });

  document.getElementById('btn-decline-revive').addEventListener('click', () => {
    declineReviveToGameOver();
  });

  // Game over terminal responses
  document.getElementById('btn-retry-game').addEventListener('click', () => {
    startRunningSession();
  });

  document.getElementById('btn-exit-lobby').addEventListener('click', () => {
    returnToLobbyTerminal();
  });

  // Standard keyboard arrow control trigger
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (currentGameState === 'PLAYING') {
        e.preventDefault();
        triggerPlayerJump();
      } else if (currentGameState === 'MENU') {
        e.preventDefault();
        startRunningSession();
      }
    }
  });

  // Handle touch interactions on Canvas for rapid responsive jump triggering
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (currentGameState === 'PLAYING') {
      triggerPlayerJump();
    }
  }, { passive: false });
}

function toggleSoundMuted() {
  gameMuted = !gameMuted;
  soundManager.setMute(gameMuted);
  updateMutedIconState();
}

function triggerPlayerJump() {
  if (player.isGrounded) {
    player.vy = JUMP_FORCE;
    player.isGrounded = false;
    player.jumpCount = 1;
    soundManager.playJump();
    
    // Sparks at point of launch
    spawnJumpParticles(PLAYER_X + player.width / 2, GROUND_Y);
  } else if (player.jumpCount === 1) {
    player.vy = DOUBLE_JUMP_FORCE;
    player.jumpCount = 2;
    player.rotation = 0; // Begin mid-air flip
    soundManager.playDoubleJump();
    
    spawnJumpParticles(PLAYER_X + player.width / 2, player.y + player.height / 2);
  }
}


// ==========================================
// 8. SKIN CORES SHOP RENDERING ENGINE
// ==========================================

function populateSkinsGrid() {
  const container = document.getElementById('skins-grid-container');
  if (!container) return;
  container.innerHTML = '';

  SKINS.forEach((skin) => {
    const isUnlocked = unlockedSkinIds.includes(skin.id);
    const isSelected = activeSkin.id === skin.id;

    const card = document.createElement('div');
    card.className = `skin-card ${isSelected ? 'selected' : ''}`;
    card.id = `skin-id-${skin.id}`;

    // Compute status display label
    let statusLabelHTML = '';
    if (isSelected) {
      statusLabelHTML = `<span class="skin-status status-active">EQUIPPED</span>`;
    } else if (isUnlocked) {
      statusLabelHTML = `<span class="skin-status status-unlocked">EQUIP</span>`;
    } else {
      statusLabelHTML = `<span class="skin-status status-cost">◆ ${skin.cost}</span>`;
    }

    card.innerHTML = `
      <div class="skin-preview-indicator" style="background: ${skin.color}; box-shadow: 0 0 8px ${skin.glowColor};"></div>
      <h4 class="skin-name">${skin.name}</h4>
      ${statusLabelHTML}
    `;

    card.addEventListener('click', () => {
      handleSkinCardInteraction(skin);
    });

    container.appendChild(card);
  });
}

function handleSkinCardInteraction(skin) {
  const isUnlocked = unlockedSkinIds.includes(skin.id);

  if (isUnlocked) {
    // Equip the skin immediately
    activeSkin = skin;
    safeStorage.setItem('neon_runner_active_skin', skin.id);
    soundManager.playShard();
    populateSkinsGrid();
  } else {
    // Attempt purchase if shards allow
    if (totalShardsCollected >= skin.cost) {
      totalShardsCollected -= skin.cost;
      unlockedSkinIds.push(skin.id);
      
      // Save updated records
      safeStorage.setItem('neon_runner_unlocked_skins', JSON.stringify(unlockedSkinIds));
      safeStorage.setItem('neon_runner_shards', String(totalShardsCollected));
      safeStorage.setItem('neon_runner_active_skin', skin.id);
      
      activeSkin = skin;
      soundManager.playSpeedUp();
      refreshStatsUI();
      populateSkinsGrid();
    } else {
      // Flashes failed purchase rumble trigger
      const card = document.getElementById(`skin-id-${skin.id}`);
      if (card) {
        card.classList.add('pulse-failed-shake');
        setTimeout(() => card.classList.remove('pulse-failed-shake'), 400);
      }
    }
  }
}

function showShopMenu() {
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('shop-overlay').classList.remove('hidden');
}

function hideShopMenu() {
  document.getElementById('shop-overlay').classList.add('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
}


// ==========================================
// 9. RE-BOOT ENGINE SESSION LAYOUTS
// ==========================================

function startRunningSession() {
  // Reset session registers
  runScore = 0;
  runShardsGained = 0;
  runSpeed = 5.5;
  routeMilestoneDistance = 0;
  totalFramesTracked = 0;
  invincibilityTimer = 0;
  
  obstacles = [];
  shards = [];
  particles = [];
  floatingTexts = [];

  // Reset player coordinates
  player = {
    y: GROUND_Y - 32,
    vy: 0,
    width: 30,
    height: 30,
    isGrounded: true,
    jumpCount: 0,
    rotation: 0
  };

  // Prevent instant double revives
  hasRevivedInCurrentRun = false;

  // Swap layout decks
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('gameover-overlay').classList.add('hidden');
  document.getElementById('revive-overlay').classList.add('hidden');
  document.getElementById('game-hud').classList.remove('hidden');

  soundManager.resume();
  soundManager.startBGM();

  // Load active speed float alert
  addFloatingTextAlert('AUTO RUN COLLIDER LIVE', PLAYER_X, GROUND_Y - 100, activeSkin.color);

  // Swap loop states and trigger animation frames
  currentGameState = 'PLAYING';
  lastTime = performance.now();
  requestAnimationFrame(gameMainFrameLoop);
}

function addFloatingTextAlert(text, x, y, color) {
  floatingTexts.push({
    id: Math.random().toString(),
    text,
    x,
    y,
    color,
    alpha: 1.0,
    vy: -1.2,
    maxAge: 70,
    age: 0
  });
}


// ==========================================
// 10. REAL-TIME PHYSICAL ENGINES AND DRAWERS
// ==========================================

function gameMainFrameLoop(timestamp) {
  if (currentGameState !== 'PLAYING') return;

  // Throttle calculations updates relative to frame ticks
  updateGamePhysics();
  drawGameBoardGraphics();

  requestAnimationFrame(gameMainFrameLoop);
}

function updateGamePhysics() {
  totalFramesTracked++;

  // 1. Color gradient updates for Chroma Horizon spectral skins
  if (activeSkin.trailType === 'rainbow') {
    chromaHue = (chromaHue + 1) % 360;
    activeSkin.color = `hsl(${chromaHue}, 100%, 55%)`;
    activeSkin.glowColor = `hsla(${chromaHue}, 100%, 55%, 0.8)`;
  }

  // 2. Adjust shielding countdowns
  if (invincibilityTimer > 0) {
    invincibilityTimer--;
  }

  // 3. Track distance scores
  runScore += (runSpeed / 60) * 10;
  document.getElementById('hud-score-value').textContent = String(Math.floor(runScore)).padStart(6, '0');

  // Incremental speed milestones triggers
  if (totalFramesTracked % 700 === 0) {
    runSpeed += 0.45;
    soundManager.playSpeedUp();
    addFloatingTextAlert(`SPEED SURGE: ${runSpeed.toFixed(1)}x`, PLAYER_X, GROUND_Y - 110, '#f59e0b');
  }

  // 4. Gravity & coordinates for player
  player.y += player.vy;
  player.vy += GRAVITY;

  // Detect collision floor plane boundary
  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.isGrounded = true;
    player.jumpCount = 0;
    player.rotation = 0;
  } else {
    // Air spin loop speed representation
    if (player.jumpCount > 0) {
      player.rotation += 0.12;
    }
  }

  // Generate responsive skin trails relative to active speeds
  generateSkinTrailsOutput();

  // 5. Spawning layout patterns for obstacles & shards
  spawnIncomingGameObjects();

  // 6. Project and move obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.x -= runSpeed;

    // Check collision matches
    if (detectBoxOverlap(player, obs)) {
      if (invincibilityTimer === 0) {
        // Trigger Crash collision sequences
        triggerPlayerCrash(obs);
        return;
      }
    }

    // Filter off-screen obstacles once they clear the screen
    if (obs.x + obs.width < -50) {
      obstacles.splice(i, 1);
    }
  }

  // 7. Project and collect shards
  for (let i = shards.length - 1; i >= 0; i--) {
    let shd = shards[i];
    shd.x -= runSpeed;

    // Magnet proximity physics pulling shards toward player if nearby
    let dx = (PLAYER_X + 15) - shd.x;
    let dy = (player.y + 15) - shd.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 100) {
      shd.x += (dx / dist) * 7.5;
      shd.y += (dy / dist) * 7.5;
    }

    if (detectBoxOverlap(player, shd)) {
      totalShardsCollected++;
      runShardsGained++;
      soundManager.playShard();
      
      // Save balance instantly to database
      safeStorage.setItem('neon_runner_shards', String(totalShardsCollected));
      document.getElementById('hud-shards-value').textContent = String(runShardsGained).padStart(2, '0');
      
      // Floating score floaters
      addFloatingTextAlert('+1 ◆', shd.x, shd.y - 12, '#39ff14');
      spawnShardSparks(shd.x, shd.y, activeSkin.color);
      
      shards.splice(i, 1);
      continue;
    }

    if (shd.x + 12 < -50) {
      shards.splice(i, 1);
    }
  }

  // 8. Update ambient custom particle vectors
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.gravity) {
      p.vy += p.gravity;
    }
    
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // 9. Update floating text animations
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.age++;
    if (ft.age >= ft.maxAge) {
      floatingTexts.splice(i, 1);
    }
  }
}

function drawGameBoardGraphics() {
  if (!ctx) return;

  // Clear Canvas backplane board
  ctx.fillStyle = '#02010b';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  // 1. Draw glowing grid lines on the skyline backdrop
  drawCyberpunkBackplaneGrid();

  // 2. Draw Floor Bed layout
  drawRunningHighwayBed();

  // 3. Draw active obstacles
  obstacles.forEach((obs) => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    
    if (obs.type === 'SPIKE') {
      // Draw pointy hazards
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.moveTo(obs.x, GROUND_Y);
      ctx.lineTo(obs.x + obs.width / 2, GROUND_Y - obs.height);
      ctx.lineTo(obs.x + obs.width, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Draw tall blocks
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);
      
      // Neon internal laser core vector
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(obs.x + 4, GROUND_Y - obs.height + 4, obs.width - 8, obs.height - 8);
    }
  });

  // 4. Draw active power-up currency glowing shards
  shards.forEach((s) => {
    ctx.shadowBlur = 12;
    ctx.shadowColor = activeSkin.color;
    ctx.fillStyle = activeSkin.color;
    
    // Draw rotated jewel diamond
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 8);
    ctx.lineTo(s.x + 8, s.y);
    ctx.lineTo(s.x, s.y + 8);
    ctx.lineTo(s.x - 8, s.y);
    ctx.closePath();
    ctx.fill();

    // inner light core
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 3);
    ctx.lineTo(s.x + 3, s.y);
    ctx.lineTo(s.x, s.y + 3);
    ctx.lineTo(s.x - 3, s.y);
    ctx.closePath();
    ctx.fill();
  });

  // 5. Draw visual particles
  particles.forEach((p) => {
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Reset shadow effects
  ctx.shadowBlur = 0;

  // 6. Draw Player avatars
  ctx.save();
  ctx.translate(PLAYER_X + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.rotation);

  // Apply blinking opacity if shielded invincibility countdown is hot
  if (invincibilityTimer > 0 && Math.floor(invincibilityTimer / 4) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  // Draw cyber square core
  ctx.shadowBlur = 20;
  ctx.shadowColor = activeSkin.color;
  ctx.fillStyle = activeSkin.color;
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  // Inner tech geometric outlines
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(-player.width / 2.7, -player.height / 2.7, player.width / 1.35, player.height / 1.35);

  ctx.fillStyle = activeSkin.secondaryColor;
  ctx.fillRect(-player.width / 5, -player.height / 5, player.width / 2.5, player.height / 2.5);

  ctx.restore();
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // 7. Draw outer protective shield if active
  if (invincibilityTimer > 0) {
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = activeSkin.color;
    ctx.strokeStyle = activeSkin.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(PLAYER_X + 15, player.y + 15, 34, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  // 8. Draw real-time rising texts
  floatingTexts.forEach((ft) => {
    ctx.fillStyle = ft.color;
    ctx.font = `bold 10px "JetBrains Mono", monospace`;
    ctx.fillText(ft.text, ft.x, ft.y);
  });
}

function drawStaticLobbyFrame() {
  if (!ctx) return;
  // Fills static black backplane ready for play click requests
  ctx.fillStyle = '#02010b';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
  drawCyberpunkBackplaneGrid();
  drawRunningHighwayBed();
  
  // Static glowing block avatar representation
  ctx.shadowBlur = 20;
  ctx.shadowColor = activeSkin.color;
  ctx.fillStyle = activeSkin.color;
  ctx.fillRect(PLAYER_X, GROUND_Y - player.height, player.width, player.height);
}

function drawCyberpunkBackplaneGrid() {
  ctx.strokeStyle = 'rgba(30, 27, 75, 0.4)';
  ctx.lineWidth = 1;

  // Horizon line
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 140);
  ctx.lineTo(V_WIDTH, GROUND_Y - 140);
  ctx.stroke();

  // Perspective vertical rays lines
  const divisionCount = 14;
  for (let i = 0; i <= divisionCount; i++) {
    let xBottom = (i / divisionCount) * V_WIDTH;
    let xTop = (V_WIDTH / 2) + ((i - (divisionCount / 2)) * 14);
    
    ctx.beginPath();
    ctx.moveTo(xTop, GROUND_Y - 140);
    ctx.lineTo(xBottom, GROUND_Y);
    ctx.stroke();
  }

  // Perspective horizontal lines grids
  let startY = GROUND_Y - 140;
  let currY = startY;
  let multiplier = 1.15;
  let gap = 5;

  while (currY < GROUND_Y) {
    ctx.beginPath();
    ctx.moveTo(0, currY);
    ctx.lineTo(V_WIDTH, currY);
    ctx.stroke();
    gap *= multiplier;
    currY += gap;
  }
}

function drawRunningHighwayBed() {
  ctx.fillStyle = '#060412';
  ctx.fillRect(0, GROUND_Y, V_WIDTH, V_HEIGHT - GROUND_Y);

  // neon safety highway top line boundary border
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ff00ff';
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(V_WIDTH, GROUND_Y);
  ctx.stroke();
  
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
}

function generateSkinTrailsOutput() {
  const midY = player.y + player.height / 2;
  const backX = PLAYER_X;

  switch (activeSkin.trailType) {
    case 'smoke':
      // Fluff vapor puffs trailing
      if (totalFramesTracked % 2 === 0) {
        particles.push({
          x: backX,
          y: midY + (Math.random() * 8 - 4),
          vx: -(runSpeed * 0.45) - Math.random() * 2,
          vy: (Math.random() - 0.5) * 1.5,
          radius: Math.random() * 6 + 2,
          color: activeSkin.color,
          alpha: 0.82,
          decay: 0.035
        });
      }
      break;

    case 'sparkles':
      // Quick high speed sparking dust falls
      if (totalFramesTracked % 3 === 0) {
        particles.push({
          x: backX,
          y: midY,
          vx: -(runSpeed * 0.75) - Math.random() * 3,
          vy: Math.random() * 4 - 1.2, // bias fall downward
          radius: Math.random() * 2.2 + 1,
          color: activeSkin.color,
          alpha: 1.0,
          decay: 0.045
        });
      }
      break;

    default: // 'smooth' / 'rainbow' trails
      // Flat clean particles line
      particles.push({
        x: backX,
        y: midY,
        vx: -(runSpeed),
        vy: 0,
        radius: 4,
        color: activeSkin.color,
        alpha: 0.9,
        decay: 0.05
      });
      break;

  }
}

function spawnIncomingGameObjects() {
  // Spawns items smoothly based on frames
  if (totalFramesTracked % 110 === 0) {
    const isDoubleSpike = Math.random() > 0.65;
    const height = Math.random() > 0.5 ? 40 : 25;
    
    obstacles.push({
      x: V_WIDTH + 50,
      width: isDoubleSpike ? 50 : 24,
      height,
      type: Math.random() > 0.45 ? 'SPIKE' : 'BLOCK'
    });

    // Optionally spawn tracking shards floating elegantly behind hazards
    if (Math.random() > 0.25) {
      const shdCount = Math.floor(Math.random() * 3) + 1;
      const originY = GROUND_Y - (height + 55);
      
      for (let k = 0; k < shdCount; k++) {
        shards.push({
          x: V_WIDTH + 80 + (k * 28),
          y: originY - (k * 14)
        });
      }
    }
  }
}

function spawnShardSparks(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      radius: Math.random() * 2 + 1,
      color,
      alpha: 1.0,
      decay: 0.04
    });
  }
}

function triggerPlayerCrash(obs) {
  currentGameState = 'SUSPENDED';
  soundManager.playExplosion();

  // Burst explosion vectors outward
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 7;
    particles.push({
      x: PLAYER_X + 15,
      y: player.y + 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      radius: Math.random() * 4 + 1.5,
      color: i % 2 === 0 ? activeSkin.color : '#ff00ff',
      alpha: 1.0,
      decay: 0.015,
      gravity: 0.09
    });
  }

  // Instantly draw explosion particles
  for (let step = 0; step < 8; step++) {
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay * 0.4;
    });
  }
  drawGameBoardGraphics();

  // Load highscore registers updates
  if (runScore > highScoreValue) {
    highScoreValue = Math.floor(runScore);
    safeStorage.setItem('neon_runner_highscore', String(highScoreValue));
  }

  // Determine if player has option to revive, else straight to terminal death screen
  setTimeout(() => {
    if (!hasRevivedInCurrentRun) {
      // Prompt user option revive menu
      launchReviveDecisionDialog();
    } else {
      displayGameOverMenuSummary();
    }
  }, 700);
}

function detectBoxOverlap(boxA, boxB) {
  // Simple AABB collision checking
  const aLeft = PLAYER_X;
  const aRight = PLAYER_X + boxA.width;
  const aTop = boxA.y;
  const aBottom = boxA.y + boxA.height;

  // Obstacle coordinates are absolute
  const bLeft = boxB.x;
  const bRight = boxB.x + (boxB.width || 16); // Jeweled shards have default 16 radius collision
  const bTop = boxB.y - (boxB.height || 16);
  const bBottom = boxB.y || (boxB.y + 16);

  // If spiked, offset bounding box slightly to make collision logic feel fair to player
  let spikeTolerance = boxB.type === 'SPIKE' ? 4 : 0;

  return (
    aLeft + spikeTolerance < bRight &&
    aRight - spikeTolerance > bLeft &&
    aBottom > bTop + spikeTolerance &&
    aTop < bBottom
  );
}


// ==========================================
// 11. REVIVE MECHANICS (FREE VS. VIDEO INTERSTITAL REWARD)
// ==========================================

function launchReviveDecisionDialog() {
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('revive-overlay').classList.remove('hidden');
  
  // Render score details inside overlay window
  document.getElementById('revive-score-display').textContent = `${Math.floor(runScore)} PTS`;
  
  // Disable button if user doesn't have sufficient shards
  const shardsBtn = document.getElementById('btn-spend-shards-revive');
  if (totalShardsCollected < 5) {
    shardsBtn.disabled = true;
    shardsBtn.style.opacity = '0.4';
  } else {
    shardsBtn.disabled = false;
    shardsBtn.style.opacity = '1.0';
  }

  refreshStatsUI();
}

function attemptShardsRevive() {
  if (totalShardsCollected >= 5) {
    totalShardsCollected -= 5;
    safeStorage.setItem('neon_runner_shards', String(totalShardsCollected));
    executeRevivePulseAnimation();
  }
}

function executeRevivePulseAnimation() {
  hasRevivedInCurrentRun = true;
  document.getElementById('revive-overlay').classList.add('hidden');
  document.getElementById('game-hud').classList.remove('hidden');

  // Push incoming collisions away to prevent spawn hazard deaths
  obstacles = obstacles.filter(o => o.x > 320);

  // Restore player coordinate loop configurations
  player.y = GROUND_Y - 32;
  player.vy = 0;
  player.isGrounded = true;
  player.jumpCount = 0;
  player.rotation = 0;

  // Provide protective neon shield duration frames (~2.5s)
  invincibilityTimer = 150;

  // Protective circular particle burst
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    particles.push({
      x: PLAYER_X + 15,
      y: GROUND_Y - 16,
      vx: Math.cos(angle) * 4,
      vy: Math.sin(angle) * 4,
      radius: 3.2,
      color: activeSkin.color,
      alpha: 1.0,
      decay: 0.02
    });
  }

  soundManager.playSpeedUp();
  
  // Re-engage game frame loop rendering
  currentGameState = 'PLAYING';
  lastTime = performance.now();
  requestAnimationFrame(gameMainFrameLoop);
}

function declineReviveToGameOver() {
  document.getElementById('revive-overlay').classList.add('hidden');
  displayGameOverMenuSummary();
}


// ==========================================
// 12. RUN-END OVERLAYS
// ==========================================

function displayGameOverMenuSummary() {
  soundManager.stopBGM();
  
  // Overlay swap views
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('gameover-overlay').classList.remove('hidden');

  // Set final values indicators
  document.getElementById('gameover-score-val').textContent = `${Math.floor(runScore)} PTS`;
  document.getElementById('gameover-shards-gained').textContent = `+${runShardsGained}`;

  refreshStatsUI();
}

function returnToLobbyTerminal() {
  document.getElementById('gameover-overlay').classList.add('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
  
  currentGameState = 'MENU';
  refreshStatsUI();
  drawStaticLobbyFrame();
}
