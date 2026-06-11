/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private bgmIntervalId: any = null;
  private bgmStep = 0;
  private synthTempo = 240; // BPM

  init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBGM();
    } else {
      this.resume();
      this.startBGM();
    }
  }

  private createOscillator(
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    gainStart: number
  ) {
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

    // Two rapid high-pitched sweet chime notes
    const time = this.ctx.currentTime;
    
    // Note 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, time);
    gain1.gain.setValueAtTime(0.1, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(time);
    osc1.stop(time + 0.1);

    // Note 2, 60ms later
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318, time + 0.06);
    gain2.gain.setValueAtTime(0.08, time + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
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

    // Sub rumble sweep
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, time);
    subOsc.frequency.exponentialRampToValueAtTime(10, time + duration);
    subGain.gain.setValueAtTime(0.25, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // Add a simple band pass filter for explosion texture
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
    
    // Synth rising tone alert
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

    // Procedural drum & bass synthesizer loop
    const intervalMs = (60 / this.synthTempo) * 1000; // BPM step division

    // Cyberpunk synth bass notes loop
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

      // Play soft bass pulse on step 0, 2, 4, 6...
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

      // Play ultra-soft hi-hat tick sound on step 1, 3, 5, 7
      if (this.bgmStep % 4 === 2) {
        // High frequency white noise burst simulation
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

export const soundManager = new SoundManager();
