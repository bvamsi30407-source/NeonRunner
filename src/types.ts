/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameStateObj = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'REVIVING';

export interface Player {
  y: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  jumpCount: number;
  rotation: number;
}

export type ObstacleType = 'TRIANGLE' | 'DOUBLE_TRIANGLE' | 'LASER_BARRIER' | 'FLOATING_BAR';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  color: string;
  passed: boolean;
}

export interface Shard {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  collected: boolean;
  pulseOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
}

export interface Skin {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  cost: number;
  trailType: 'sparkles' | 'smooth' | 'rainbow' | 'smoke';
  description: string;
}
