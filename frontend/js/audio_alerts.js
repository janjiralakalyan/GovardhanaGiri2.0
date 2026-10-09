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
    this.waterNoiseNode = null;
    this.waterGain = null;
    this.enabled = true;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.isMuted) {
      this.toggleSiren(false);
      this.setWaterTorrent(0);
    }
  }

  playBeep(freq = 880, duration = 0.15) {
    if (!this.enabled || this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
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
    if (!this.enabled || this.isMuted) return;
    this.playBeep(987.77, 0.12);
    setTimeout(() => this.playBeep(1318.51, 0.25), 140);
  }

  playAlertSound(tier = 'Critical') {
    if (!this.enabled || this.isMuted) return;
    if (tier === 'Critical') {
      this.playCriticalChime();
    } else {
      this.playBeep(660, 0.2);
    }
  }

  playThunder() {
    if (!this.enabled || this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 2.0;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.04 * white)) / 1.04;
        data[i] = lastOut * 3.5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(45, now + 1.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch (e) {
      console.warn("Thunder synth error:", e);
    }
  }

  setWaterTorrent(intensity = 0) {
    if (!this.enabled || this.isMuted || intensity <= 0.02) {
      if (this.waterGain && this.ctx) {
        this.waterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (!this.waterNoiseNode) {
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99 * b0 + white * 0.05;
          b1 = 0.95 * b1 + white * 0.1;
          b2 = 0.85 * b2 + white * 0.2;
          data[i] = (b0 + b1 + b2) * 0.4;
        }
        this.waterNoiseNode = this.ctx.createBufferSource();
        this.waterNoiseNode.buffer = buffer;
        this.waterNoiseNode.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 420;
        filter.Q.value = 1.2;

        this.waterGain = this.ctx.createGain();
        this.waterGain.gain.setValueAtTime(0.001, now);

        this.waterNoiseNode.connect(filter);
        filter.connect(this.waterGain);
        this.waterGain.connect(this.ctx.destination);
        this.waterNoiseNode.start(now);
      }

      const targetGain = Math.min(0.18, intensity * 0.14);
      this.waterGain.gain.linearRampToValueAtTime(targetGain, now + 0.1);
    } catch (e) {
      console.warn("Water synth error:", e);
    }
  }

  toggleSiren(play = true, maxDuration = 8) {
    if ((!this.enabled || this.isMuted) && play) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.sirenAutoStopTimer) {
        clearTimeout(this.sirenAutoStopTimer);
        this.sirenAutoStopTimer = null;
      }
      if (play && !this.isPlayingSiren) {
        // Create emergency wailing siren using frequency modulation
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenModulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();

        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

        // LFO for wailing effect (1.2 Hz)
        this.sirenModulator.type = 'sine';
        this.sirenModulator.frequency.setValueAtTime(1.2, this.ctx.currentTime);
        modGain.gain.setValueAtTime(320, this.ctx.currentTime); // modulate ±320 Hz

        this.sirenModulator.connect(modGain);
        modGain.connect(this.sirenOsc.frequency);

        this.sirenGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);

        this.sirenOsc.start();
        this.sirenModulator.start();
        this.isPlayingSiren = true;

        // Auto-stop after maxDuration seconds so siren never runs endlessly
        if (maxDuration > 0) {
          this.sirenAutoStopTimer = setTimeout(() => {
            this.toggleSiren(false);
            const btn = document.getElementById('btn-toggle-siren');
            if (btn) {
              btn.classList.remove('active');
              btn.innerHTML = '🔈 Test Warning Siren';
            }
            if (window.app) window.app.isSirenActive = false;
          }, maxDuration * 1000);
        }
      } else if (!play && this.isPlayingSiren) {
        if (this.sirenOsc) {
          try { this.sirenOsc.stop(); } catch(e){}
          try { this.sirenOsc.disconnect(); } catch(e){}
          this.sirenOsc = null;
        }
        if (this.sirenModulator) {
          try { this.sirenModulator.stop(); } catch(e){}
          try { this.sirenModulator.disconnect(); } catch(e){}
          this.sirenModulator = null;
        }
        this.isPlayingSiren = false;
      }
    } catch (e) {
      console.warn("Siren synth error:", e);
    }
  }
}

window.disasterAudio = new DisasterAudioEngine();
