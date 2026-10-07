/**
 * GovardhanaGiri 2.0: Web Audio Synthesizer for Emergency Warning Sirens & Chimes
 * Generates warning audio tones directly in browser via native Web Audio API.
 */

class DisasterAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlayingSiren = false;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenModulator = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 880, duration = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play prevented:", e);
    }
  }

  playCriticalChime() {
    if (!this.enabled) return;
    this.playBeep(987.77, 0.12);
    setTimeout(() => this.playBeep(1318.51, 0.25), 140);
  }

  toggleSiren(play = true) {
    if (!this.enabled && play) return;
    try {
      this.init();
      if (play && !this.isPlayingSiren) {
        // Create emergency wailing siren using frequency modulation
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenModulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();

        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);

        // LFO for wailing effect (0.8 Hz)
        this.sirenModulator.type = 'sine';
        this.sirenModulator.frequency.setValueAtTime(0.8, this.ctx.currentTime);
        modGain.gain.setValueAtTime(250, this.ctx.currentTime); // modulate ±250 Hz

        this.sirenModulator.connect(modGain);
        modGain.connect(this.sirenOsc.frequency);

        this.sirenGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);

        this.sirenOsc.start();
        this.sirenModulator.start();
        this.isPlayingSiren = true;
      } else if (!play && this.isPlayingSiren) {
        if (this.sirenOsc) {
          this.sirenOsc.stop();
          this.sirenOsc.disconnect();
        }
        if (this.sirenModulator) {
          this.sirenModulator.stop();
          this.sirenModulator.disconnect();
        }
        this.isPlayingSiren = false;
      }
    } catch (e) {
      console.warn("Siren synth error:", e);
    }
  }
}

window.disasterAudio = new DisasterAudioEngine();
