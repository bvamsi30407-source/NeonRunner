/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Skin } from '../types';

export const SKINS: Skin[] = [
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
    description: 'An aggressive, high-pressure pink shockwave. Sizzles in motion.'
  },
  {
    id: 'acid_overload',
    name: 'Acid Overload',
    color: '#39ff14',
    secondaryColor: '#006400',
    glowColor: 'rgba(57, 255, 20, 0.8)',
    cost: 30,
    trailType: 'sparkles',
    description: 'Highly volatile bio-luminescent neon sludge. Drops toxic sparks.'
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    color: '#ffaa00',
    secondaryColor: '#d2691e',
    glowColor: 'rgba(255, 170, 0, 0.8)',
    cost: 50,
    trailType: 'smooth',
    description: 'Harvested directly from thermonuclear solar winds. Elite heat.'
  },
  {
    id: 'chroma_spectrum',
    name: 'Chroma Horizon',
    color: '#ff00ff', // Will cycle dynamically in code!
    secondaryColor: '#00ffff',
    glowColor: 'rgba(255, 255, 255, 0.9)',
    cost: 100,
    trailType: 'rainbow',
    description: 'A legendary masterwork that bends the full visible light spectrum.'
  }
];
