/** Locally synthesised ambience. No network, autoplay, or external audio assets. */
export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.volume = 0.45;
    this.muted = false;
    this.started = false;
    this.elapsed = 0;
    this.nextWheel = 0.1;
    this.nextThunder = 18;
    this.nodes = [];
  }
  async start() {
    if (this.started) {
      if (this.context?.state === 'suspended') await this.context.resume();
      return;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.context.destination);
    this.started = true;
    const ctx = this.context;
    const len = ctx.sampleRate * 4;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.035) / 1.02;
      d[i] = brown * 3;
    }
    this.rain = ctx.createBuffer(1, len, ctx.sampleRate);
    const r = this.rain.getChannelData(0);
    for (let i = 0; i < len; i++) r[i] = (Math.random() * 2 - 1) * 0.5;
    this.loopNoise(this.rain, 950, 0.027, 'highpass');
    this.loopNoise(this.noise, 180, 0.07, 'lowpass');
    // Restrained suspended harmony, fading in beneath the carriage noise.
    [55, 82.407, 110.13, 146.83].forEach((freq, i) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.008 / (1 + i * 0.35), ctx.currentTime + 5);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.nodes.push(osc);
    });
    await ctx.resume();
  }
  loopNoise(buffer, freq, volume, type) {
    const c = this.context,
      source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = freq;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    this.nodes.push(source);
  }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.context.currentTime,
        0.12,
      );
  }
  toggle() {
    this.muted = !this.muted;
    this.setVolume(this.volume);
    return this.muted;
  }
  tone(freq, duration, volume = 0.1, delay = 0, type = 'sine') {
    if (!this.started) return;
    const c = this.context,
      t = c.currentTime + delay,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  burst(duration, volume, freq, delay = 0, type = 'lowpass') {
    if (!this.started) return;
    const c = this.context,
      t = c.currentTime + delay,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noise;
    s.loop = true;
    f.type = type;
    f.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + duration + 0.05);
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  cue(name) {
    if (!this.started) return;
    if (name === 'footstep' || name === 'footsteps') {
      this.burst(0.14, 0.09, 190);
      this.burst(0.07, 0.025, 1200);
    } else if (name === 'discovery' || name === 'evidence') {
      this.tone(440, 1.8, 0.035);
      this.tone(659.25, 2.2, 0.027, 0.16);
      this.tone(880, 2.5, 0.016, 0.32);
    } else if (name === 'door') {
      this.burst(0.38, 0.15, 320);
      this.tone(93, 0.25, 0.018);
      this.burst(0.13, 0.11, 520, 0.3);
    } else if (name === 'thunder') {
      this.burst(3.8, 0.4, 95);
      this.burst(2.7, 0.2, 190, 0.35);
    } else if (name === 'contradiction' || name === 'confrontation') {
      this.tone(73.416, 3, 0.075);
      this.tone(77.78, 2.7, 0.025, 0.12);
      this.tone(293.66, 1.8, 0.025, 0.3);
    } else if (name === 'cinematic' || name === 'reveal') {
      [55, 82.41, 130.81, 164.81].forEach((n, i) => this.tone(n, 5, 0.035, i * 0.4));
    } else if (name === 'tunnel') {
      this.burst(5, 0.18, 140);
      this.tone(41.2, 5, 0.04);
    } else if (name === 'click') {
      this.tone(440, 0.08, 0.013);
    }
  }
  update(dt) {
    if (!this.started || this.context.state !== 'running') return;
    this.elapsed += Math.min(dt, 0.1);
    if (this.elapsed >= this.nextWheel) {
      this.burst(0.09, 0.035, 140);
      this.burst(0.085, 0.024, 130, 0.13);
      this.nextWheel = this.elapsed + 0.72;
    }
    if (this.elapsed >= this.nextThunder) {
      this.cue('thunder');
      this.nextThunder = this.elapsed + 32 + Math.random() * 35;
    }
  }
  dispose() {
    for (const n of this.nodes)
      try {
        n.stop();
      } catch {}
    this.nodes = [];
    this.context?.close();
    this.started = false;
  }
}
