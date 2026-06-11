/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Player, Obstacle, Shard, Particle, FloatingText, GameStateObj, Skin, ObstacleType } from '../types';
import { soundManager } from '../utils/audio';

interface NeonRunnerCanvasProps {
  gameState: GameStateObj;
  activeSkin: Skin;
  isMuted: boolean;
  onScoreChange: (score: number) => void;
  onShardCollect: (runShards: number) => void;
  onGameOver: (score: number, shardsGained: number) => void;
  onStateChange: (state: GameStateObj) => void;
  triggerRevive: boolean; // Trigger to revive the player
  onReviveComplete: () => void;
  hasRevivedInRun: boolean;
}

export const NeonRunnerCanvas: React.FC<NeonRunnerCanvasProps> = ({
  gameState,
  activeSkin,
  isMuted,
  onScoreChange,
  onShardCollect,
  onGameOver,
  onStateChange,
  triggerRevive,
  onReviveComplete,
  hasRevivedInRun
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Constants
  const V_WIDTH = 800; // Virtual width
  const V_HEIGHT = 400; // Virtual height
  const GROUND_Y = 320;
  const GRAVITY = 0.52;
  const JUMP_FORCE = -11.0;
  const DOUBLE_JUMP_FORCE = -9.2;
  const PLAYER_X = 120;

  // Music state synchronization
  useEffect(() => {
    soundManager.setMute(isMuted);
  }, [isMuted]);

  // Game Variables maintained in refs for the 60fps animation loop
  const playerRef = useRef<Player>({
    y: GROUND_Y - 32,
    vy: 0,
    width: 30,
    height: 30,
    isGrounded: true,
    jumpCount: 0,
    rotation: 0
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const shardsRef = useRef<Shard[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Score & speed progression
  const scoreRef = useRef<number>(0);
  const collectedRunShardsRef = useRef<number>(0);
  const speedRef = useRef<number>(5.5);
  const distanceRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastSpeedIncreaseRef = useRef<number>(0);

  // Invincibility state (used after a revive)
  const invincibilityTimerRef = useRef<number>(0);

  // Animation frame ID
  const requestRef = useRef<number | null>(null);

  // Touch/Keyboard Jump Trigger
  const triggerJump = () => {
    if (gameState !== 'PLAYING') {
      if (gameState === 'MENU') {
        onStateChange('PLAYING');
      }
      return;
    }

    const player = playerRef.current;
    
    // Check if player has jump slots
    if (player.isGrounded) {
      player.vy = JUMP_FORCE;
      player.isGrounded = false;
      player.jumpCount = 1;
      soundManager.playJump();
      
      // Spawn small ground puff particles
      spawnJumpParticles(PLAYER_X + player.width / 2, GROUND_Y);
    } else if (player.jumpCount === 1) {
      player.vy = DOUBLE_JUMP_FORCE;
      player.jumpCount = 2;
      player.rotation = 0; // Reset rotation for double-jump flip
      soundManager.playDoubleJump();
      
      // Spawn extra burst of double jump trails
      spawnJumpParticles(PLAYER_X + player.width / 2, player.y + player.height / 2);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Handle external Revive trigger
  useEffect(() => {
    if (triggerRevive) {
      // Clear all incoming obstacles near the player to prevent instant death
      obstaclesRef.current = obstaclesRef.current.filter(o => o.x > 320);
      
      // Reset player physics
      const player = playerRef.current;
      player.y = GROUND_Y - 32;
      player.vy = 0;
      player.isGrounded = true;
      player.jumpCount = 0;
      player.rotation = 0;

      // Provide 2.5 seconds of protective glowing neon energy shield
      invincibilityTimerRef.current = 150; // ~2.5 secs at 60fps
      
      // Spawn a wave of protective cyan particles
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        particlesRef.current.push({
          x: PLAYER_X + 15,
          y: GROUND_Y - 16,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          radius: 3,
          color: activeSkin.color,
          alpha: 1,
          decay: 0.02
        });
      }

      onReviveComplete();
    }
  }, [triggerRevive]);

  // Reset core game state logic
  useEffect(() => {
    if (gameState === 'PLAYING' && triggerRevive === false) {
      // Direct Fresh Start
      playerRef.current = {
        y: GROUND_Y - 32,
        vy: 0,
        width: 30,
        height: 30,
        isGrounded: true,
        jumpCount: 0,
        rotation: 0
      };
      obstaclesRef.current = [];
      shardsRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      
      scoreRef.current = 0;
      collectedRunShardsRef.current = 0;
      speedRef.current = 5.5;
      distanceRef.current = 0;
      frameCountRef.current = 0;
      lastSpeedIncreaseRef.current = Date.now();
      invincibilityTimerRef.current = 0;

      soundManager.resume();
      soundManager.startBGM();

      // Show welcome float
      addFloatingText('AUTO RUN ENGAGED', PLAYER_X, GROUND_Y - 100, activeSkin.color);
    } else if (gameState === 'GAMEOVER') {
      soundManager.stopBGM();
    }
  }, [gameState]);

  // Particle Generation helpers
  const spawnJumpParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4 - 2, // shoot backwards
        vy: (Math.random() - 0.2) * -3,
        radius: Math.random() * 3 + 1,
        color: activeSkin.color,
        alpha: 0.8,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  };

  const spawnShardParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        radius: Math.random() * 2.5 + 1,
        color: color,
        alpha: 1,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  };

  const spawnCrashParticles = (x: number, y: number) => {
    soundManager.playExplosion();
    // Huge spectacular ring of neon shards shooting outward
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // slightly upward biased
        radius: Math.random() * 4 + 1.5,
        color: i % 2 === 0 ? activeSkin.color : '#ff00ff',
        alpha: 1.0,
        decay: 0.012 + Math.random() * 0.015,
        gravity: 0.12 // feel gravity pull
      });
    }
  };

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      alpha: 1,
      vy: -1.2
    });
  };

  // Main game logic loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas Resizing using clientWidth/Height
    const resizeCanvas = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Main animation ticking
    const tick = () => {
      // 1. CLEAR & BACKGROUND PREPARATION
      ctx.fillStyle = '#0a0a14'; // cyber midnight dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Setup projection mapping matrix from (800x400) virtual to real viewport
      const scaleX = canvas.width / V_WIDTH;
      const scaleY = canvas.height / V_HEIGHT;

      ctx.save();
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      // 2. RENDER PARALLAX CYBERSPACE SKYLINE
      drawMidnightSkyline(ctx);

      // 3. GAMEPLAY LOGICS UPDATE (IF ACTIVE)
      if (gameState === 'PLAYING') {
        frameCountRef.current++;
        distanceRef.current += speedRef.current * 0.1;

        // Base score increases based on survived distance + speed multiplier
        const speedMultiplier = Math.floor(speedRef.current - 4);
        scoreRef.current += Math.max(1, Math.floor(0.2 * speedMultiplier));
        onScoreChange(scoreRef.current);

        // Gradually increase running speed every 10 seconds of playtime
        const now = Date.now();
        if (now - lastSpeedIncreaseRef.current > 10000) {
          speedRef.current = Math.min(speedRef.current + 0.8, 15); // cap speed at extreme 15
          lastSpeedIncreaseRef.current = now;
          soundManager.playSpeedUp();
          addFloatingText('SPEED INCREASED!', PLAYER_X + 50, GROUND_Y - 140, '#ffd700');
        }

        // Check if invincibility is decaying
        if (invincibilityTimerRef.current > 0) {
          invincibilityTimerRef.current--;
        }

        // UPDATE PLAYER PHYSICS
        const player = playerRef.current;
        player.vy += GRAVITY;
        player.y += player.vy;

        // Collision against ground limit
        const limitY = GROUND_Y - player.height;
        if (player.y >= limitY) {
          player.y = limitY;
          player.vy = 0;
          player.isGrounded = true;
          player.jumpCount = 0;

          // Standard spin rotation settles when landing
          player.rotation = 0;
        } else {
          // Add beautiful futuristic spin in mid-air
          player.isGrounded = false;
          player.rotation += 0.09;
        }

        // BREED TRAILS & SPARKLES EMISSION ON RUN
        spawnContinuousTrail(player);

        // HANDLE INCOMING NEON OBSTACLES (SPAWNING & SLIDING)
        handleObstaclesSpawning();

        // UPDATE OBSTACLE TRANSLATIONS & COLLISIONS
        updateObstacles(ctx);

        // HANDLE SHARDS COLLECTIBLES
        handleShardsSpawning();
        updateShards(ctx);
      }

      // 4. DRAW REMAINING ELEMENTS (GRID, PARTICLES, FLOATING TEXTS, MENUS, PLAYER)
      drawNeonFloorGrid(ctx);
      updateAndDrawParticles(ctx);
      updateAndDrawFloatingTexts(ctx);
      drawPlayer(ctx);

      ctx.restore();

      // Cycle animation
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, activeSkin]);

  // Trail generation behind the running player
  const spawnContinuousTrail = (player: Player) => {
    if (frameCountRef.current % 3 === 0) {
      let color = activeSkin.color;
      
      // Dynamic rainbow cycle for Chroma Horizon skin
      if (activeSkin.id === 'chroma_spectrum') {
        const hue = (frameCountRef.current * 3) % 360;
        color = `hsla(${hue}, 100%, 60%, 1)`;
      }

      const isChroma = activeSkin.id === 'chroma_spectrum';

      particlesRef.current.push({
        x: PLAYER_X,
        y: player.y + player.height / 2 + (Math.random() - 0.5) * 12,
        vx: -speedRef.current * 0.4 - (Math.random() * 1.5), // fly back
        vy: (Math.random() - 0.5) * 1,
        radius: activeSkin.trailType === 'sparkles' ? Math.random() * 4 + 1 : Math.random() * 3 + 2,
        color: color,
        alpha: 0.6,
        decay: activeSkin.trailType === 'smoke' ? 0.015 : 0.03
      });
    }
  };

  // Neon skyline background scrolling slowly
  const drawMidnightSkyline = (ctx: CanvasRenderingContext2D) => {
    const scrollOffset = (distanceRef.current * 0.15) % V_WIDTH;

    ctx.save();
    // Subtle star dots in background
    ctx.fillStyle = '#15152a';
    for (let i = 1; i <= 15; i++) {
      const starX = (V_WIDTH / 15) * i - (scrollOffset * 0.2);
      const starY = (Math.sin(i) * 50) + 80;
      ctx.fillRect((starX + V_WIDTH) % V_WIDTH, starY, 1.8, 1.8);
    }

    // Glowing Neon Mountain peaks/Towers
    ctx.strokeStyle = '#1d1936';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // Draw repeating skyline silhouette
    for (let x = -100; x < V_WIDTH + 200; x += 150) {
      const drawX = x - (scrollOffset * 0.5);
      const h = ((Math.sin(x) + 1) * 40) + 100;
      ctx.moveTo(drawX, GROUND_Y);
      ctx.lineTo(drawX + 60, GROUND_Y - h);
      ctx.lineTo(drawX + 120, GROUND_Y);
    }
    ctx.stroke();

    // Adding tall technical cyber towers
    ctx.strokeStyle = '#111024';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const towerX = (i * 240) - (scrollOffset * 0.8);
      const h = 180 + (i % 2 === 0 ? 30 : -30);
      ctx.strokeRect(towerX, GROUND_Y - h, 40, h);
      
      // glowing antenna light
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(towerX + 20, GROUND_Y - h, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Render a scrolling neon tech grid perspective
  const drawNeonFloorGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    // Draw solid ground limit line
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#800080';
    ctx.strokeStyle = '#da70d6'; // Orchid purple neon ground line
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(V_WIDTH, GROUND_Y);
    ctx.stroke();

    // Neon floor grid scrolling mesh lines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(128, 0, 128, 0.45)';
    ctx.lineWidth = 1;

    // Draw 3-4 horizontal layout wires under ground
    const groundSpace = V_HEIGHT - GROUND_Y;
    for (let i = 1; i <= 5; i++) {
      const wireY = GROUND_Y + (groundSpace / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, wireY);
      ctx.lineTo(V_WIDTH, wireY);
      ctx.stroke();
    }

    // Scrolling perspective vertical lines
    const gridSpacing = 45;
    const scrollOffset = (distanceRef.current * speedRef.current * 0.7) % gridSpacing;
    for (let x = -gridSpacing; x < V_WIDTH + gridSpacing; x += gridSpacing) {
      const lineX = x - scrollOffset;
      ctx.beginPath();
      ctx.moveTo(lineX, GROUND_Y);
      ctx.lineTo(lineX - 45, V_HEIGHT); // diagonal offset for pseudo 3d scrolling
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw the active glowing player
  const drawPlayer = (ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current;
    
    ctx.save();
    
    // Dynamic Chroma cycle if chroma skin
    let skinColor = activeSkin.color;
    if (activeSkin.id === 'chroma_spectrum') {
      const hue = (Date.now() / 15) % 360;
      skinColor = `hsla(${hue}, 100%, 60%, 1)`;
    }

    // Glow bloom shader
    ctx.shadowBlur = 20;
    ctx.shadowColor = skinColor;
    ctx.fillStyle = skinColor;

    // Draw spinning cube avatar of user
    ctx.translate(PLAYER_X + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);

    // Inner glowing block details
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    // Draw cyber accent core shape inside
    ctx.strokeRect(-player.width / 3, -player.height / 3, (player.width / 3) * 2, (player.height / 3) * 2);

    ctx.restore();

    // DRAW SHIELD IF PROTECTED AFTER REVIVING
    if (invincibilityTimerRef.current > 0) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = skinColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 + Math.abs(Math.sin(Date.now() / 100) * 2);
      
      ctx.beginPath();
      ctx.arc(PLAYER_X + player.width / 2, player.y + player.height / 2, 28, 0, Math.PI * 2);
      ctx.stroke();
      
      // Cyber radar sweep on shield
      ctx.strokeStyle = `rgba(${parseInt(skinColor.slice(1,3), 16) || 0}, ${parseInt(skinColor.slice(3,5), 16) || 255}, ${parseInt(skinColor.slice(5,7), 16) || 255}, 0.35)`;
      ctx.beginPath();
      ctx.arc(PLAYER_X + player.width / 2, player.y + player.height / 2, 28, (Date.now() / 200) % (Math.PI * 2), ((Date.now() / 200) + 1.2) % (Math.PI * 2));
      ctx.stroke();

      ctx.restore();
    }
  };

  // OBSTACLES CONTROLLER LOGIC
  const handleObstaclesSpawning = () => {
    // Only spawn if no obstacles recently spawned
    const activeObstacles = obstaclesRef.current;
    const lastObstacle = activeObstacles[activeObstacles.length - 1];

    // Responsive spawn gap dependent on current running speed
    const minSpawnDistance = 280 + (speedRef.current * 18);
    const randomBuffer = Math.random() * 190;

    if (!lastObstacle || (V_WIDTH - lastObstacle.x) >= (minSpawnDistance + randomBuffer)) {
      const types: ObstacleType[] = ['TRIANGLE', 'DOUBLE_TRIANGLE', 'LASER_BARRIER', 'FLOATING_BAR'];
      const odds = Math.random();
      
      let typeSelected: ObstacleType = 'TRIANGLE';
      let w = 32;
      let h = 32;
      let y = GROUND_Y - h;
      let color = '#ff007f'; // electric neon magenta

      if (odds < 0.4) {
        typeSelected = 'TRIANGLE';
        w = 32;
        h = 32;
        y = GROUND_Y - h;
      } else if (odds < 0.65) {
        typeSelected = 'DOUBLE_TRIANGLE';
        w = 64;
         h = 32;
         y = GROUND_Y - h;
         color = '#ff4500'; // danger orange-red
      } else if (odds < 0.85) {
        typeSelected = 'FLOATING_BAR';
        w = 40;
        h = 16;
        y = GROUND_Y - 95; // floats high, player can walk underneath
        color = '#ff00ff';
      } else {
        typeSelected = 'LASER_BARRIER';
        w = 12;
        h = 75; // quite tall wall
        y = GROUND_Y - h;
        color = '#39ff14'; // radiant acidic green
      }

      obstaclesRef.current.push({
        id: Math.random().toString(),
        x: V_WIDTH + 50,
        y,
        width: w,
        height: h,
        type: typeSelected,
        color,
        passed: false
      });
    }
  };

  const updateObstacles = (ctx: CanvasRenderingContext2D) => {
    const obstacles = obstaclesRef.current;
    const player = playerRef.current;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      // Slide obstacle left
      obstacle.x -= speedRef.current;

      // Draw obstacle on canvas
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = obstacle.color;
      ctx.strokeStyle = obstacle.color;
      ctx.lineWidth = 3.5;

      if (obstacle.type === 'TRIANGLE' || obstacle.type === 'DOUBLE_TRIANGLE') {
        ctx.beginPath();
        if (obstacle.type === 'TRIANGLE') {
          ctx.moveTo(obstacle.x, GROUND_Y);
          ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width, GROUND_Y);
        } else {
          // Double spike
          ctx.moveTo(obstacle.x, GROUND_Y);
          ctx.lineTo(obstacle.x + obstacle.width * 0.25, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width * 0.5, GROUND_Y);
          ctx.moveTo(obstacle.x + obstacle.width * 0.5, GROUND_Y);
          ctx.lineTo(obstacle.x + obstacle.width * 0.75, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width, GROUND_Y);
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255,0,127,0.12)';
        ctx.fill();
        
      } else if (obstacle.type === 'LASER_BARRIER') {
        // Neon tech Laser fence posts
        ctx.beginPath();
        // Left post
        ctx.rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.stroke();
        
        // Inner vertical beams pulsing
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 + Math.abs(Math.sin(Date.now() / 50) * 1.5);
        ctx.strokeRect(obstacle.x + 3, obstacle.y + 4, obstacle.width - 6, obstacle.height - 8);
        
      } else if (obstacle.type === 'FLOATING_BAR') {
        // High floating gate obstacle
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = 'rgba(255,255,0,0.15)';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

      ctx.restore();

      // Trigger score gains on obstacle clear
      if (!obstacle.passed && obstacle.x + obstacle.width < PLAYER_X) {
        obstacle.passed = true;
        scoreRef.current += 150; // extra survival points
        onScoreChange(scoreRef.current);
        addFloatingText('+150', PLAYER_X, player.y - 12, '#00ffff');
      }

      // COLLISION CHECKS
      if (invincibilityTimerRef.current === 0) {
        const isColliding = checkRectCollision(
          PLAYER_X, player.y, player.width, player.height,
          obstacle.x, obstacle.y, obstacle.width, obstacle.height
        );

        if (isColliding) {
          // Crash explosion!
          spawnCrashParticles(PLAYER_X + player.width / 2, player.y + player.height / 2);
          
          if (!hasRevivedInRun) {
            // Trigger Reconstruct Avatar menu!
            onStateChange('REVIVING');
          } else {
            // Settle final Game Over
            onGameOver(scoreRef.current, collectedRunShardsRef.current);
            onStateChange('GAMEOVER');
          }
          break;
        }
      }

      // Cleanup out of bounds
      if (obstacle.x < -100) {
        obstacles.splice(i, 1);
      }
    }
  };

  // SHARDS COLLECTIONS LOGIC
  const handleShardsSpawning = () => {
    const activeShards = shardsRef.current;
    const lastShard = activeShards[activeShards.length - 1];

    // Ensure we don't spawn clusters too frequently
    const gap = 200 + Math.random() * 250;
    if (!lastShard || (V_WIDTH - lastShard.x) >= gap) {
      const groupType = Math.random();
      const count = 3 + Math.floor(Math.random() * 3);
      
      const baseX = V_WIDTH + 60;
      const waveFreq = 0.5; // sine wave spacing

      if (groupType < 0.4) {
        // Render in Arch curves
        for (let i = 0; i < count; i++) {
          const shardX = baseX + (i * 35);
          // Angle maps to arched trajectory
          const angle = (i / (count - 1)) * Math.PI;
          const shardY = GROUND_Y - 45 - Math.sin(angle) * 75;

          shardsRef.current.push({
            id: Math.random().toString(),
            x: shardX,
            y: shardY,
            radius: 6,
            color: '#00ffff', // neon teal cyan
            collected: false,
            pulseOffset: Math.random() * 10
          });
        }
      } else {
        // Straight line floating shard path
        const randomHeightY = GROUND_Y - 40 - (Math.random() * 85);
        for (let i = 0; i < count; i++) {
          shardsRef.current.push({
            id: Math.random().toString(),
            x: baseX + (i * 40),
            y: randomHeightY,
            radius: 6,
            color: '#00ffff',
            collected: false,
            pulseOffset: Math.random() * 10
          });
        }
      }
    }
  };

  const updateShards = (ctx: CanvasRenderingContext2D) => {
    const shards = shardsRef.current;
    const player = playerRef.current;

    for (let i = shards.length - 1; i >= 0; i--) {
      const shard = shards[i];
      shard.x -= speedRef.current;

      // Draw shiny neon star shard shape on canvas
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = shard.color;
      ctx.fillStyle = shard.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      ctx.beginPath();
      const pulseRadius = shard.radius + Math.sin((frameCountRef.current + shard.pulseOffset) * 0.1) * 1.5;
      
      // Draw diamond sparkling gem shape
      ctx.moveTo(shard.x, shard.y - pulseRadius);
      ctx.lineTo(shard.x + pulseRadius, shard.y);
      ctx.lineTo(shard.x, shard.y + pulseRadius);
      ctx.lineTo(shard.x - pulseRadius, shard.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Check pickup collision
      const checkDist = dist(PLAYER_X + player.width / 2, player.y + player.height / 2, shard.x, shard.y);
      // Player center radius approximate to 20
      if (checkDist < 16 + pulseRadius) {
        shard.collected = true;
        // Increment collections count
        collectedRunShardsRef.current += 1;
        onShardCollect(collectedRunShardsRef.current);

        // Score additions
        scoreRef.current += 100;
        onScoreChange(scoreRef.current);
        
        // Spawn pop sparkles
        spawnShardParticles(shard.x, shard.y, shard.color);
        soundManager.playShard();
        addFloatingText('+100 SHARD', shard.x, shard.y - 10, shard.color);

        shards.splice(i, 1);
        continue;
      }

      // Cleanup
      if (shard.x < -50) {
        shards.splice(i, 1);
      }
    }
  };

  // Render & translate active particles (explosions and trails)
  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    const arr = particlesRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) {
        p.vy += p.gravity;
      }
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        arr.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // Floating notifications render
  const updateAndDrawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    const texts = floatingTextsRef.current;
    ctx.save();
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.y += t.vy;
      t.alpha -= 0.02;

      if (t.alpha <= 0) {
        texts.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = t.alpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = t.color;
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  };

  // Math helper for precise rectangle-to-rectangle bounds check
  const checkRectCollision = (
    rx1: number, ry1: number, rw1: number, rh1: number,
    rx2: number, ry2: number, rw2: number, rh2: number
  ): boolean => {
    // Add brief buffer window inner inset to make collisions fair and friendly for high arcade speed
    const padding = 2; 
    return (
      rx1 + padding < rx2 + rw2 - padding &&
      rx1 + rw1 - padding > rx2 + padding &&
      ry1 + padding < ry2 + rh2 - padding &&
      ry1 + rh1 - padding > ry2 + padding
    );
  };

  const dist = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-[#05050c] overflow-hidden select-none cursor-pointer"
      onPointerDown={triggerJump}
      id="neon-runner-stage-box"
    >
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
        id="neon-runner-rendering-canvas"
      />
    </div>
  );
};
