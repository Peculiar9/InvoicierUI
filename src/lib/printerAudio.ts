/**
 * The printer's voice, synthesised.
 *
 * No audio files: a thermal transport is a low motor hum plus a fast chatter
 * of the stepper, and a tear is broadband noise with a rising edge. Both are
 * cheaper to generate than to download, and they stay in tune with the
 * animation because they are driven by the same numbers.
 *
 * Nothing is created until the first user gesture, so no autoplay policy is
 * ever tripped and a visitor who never presses print never gets an
 * AudioContext at all.
 */

let ctx: AudioContext | null = null;

const context = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/** White noise, generated once per call and reused for the life of the sound. */
const noiseBuffer = (audio: AudioContext, seconds: number): AudioBuffer => {
  const frames = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

export interface RunningSound {
  stop(): void;
}

/**
 * The transport: a motor hum under a stepper chatter, gated by a square LFO
 * so the rattle lands on the same beat as the paper's visual jerk.
 */
export const startTransport = (): RunningSound | null => {
  const audio = context();
  if (!audio) return null;

  const out = audio.createGain();
  out.gain.value = 0;
  out.connect(audio.destination);
  // ease in, so the machine spins up rather than snapping on
  out.gain.linearRampToValueAtTime(0.09, audio.currentTime + 0.12);

  // --- the motor: a low saw, slightly detuned against itself
  const motor = audio.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 84;
  const motorFilter = audio.createBiquadFilter();
  motorFilter.type = 'lowpass';
  motorFilter.frequency.value = 320;
  const motorGain = audio.createGain();
  motorGain.gain.value = 0.5;
  motor.connect(motorFilter).connect(motorGain).connect(out);

  // --- the stepper: noise, band-passed to a dry rattle, chopped by an LFO
  const chatter = audio.createBufferSource();
  chatter.buffer = noiseBuffer(audio, 2);
  chatter.loop = true;
  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2600;
  band.Q.value = 3.4;
  const chatterGain = audio.createGain();
  chatterGain.gain.value = 0;

  const lfo = audio.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 11; // the ratchet rate
  const lfoDepth = audio.createGain();
  lfoDepth.gain.value = 0.32;
  lfo.connect(lfoDepth).connect(chatterGain.gain);

  chatter.connect(band).connect(chatterGain).connect(out);

  motor.start();
  chatter.start();
  lfo.start();

  return {
    stop() {
      const t = audio.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.18);
      window.setTimeout(() => {
        motor.stop();
        chatter.stop();
        lfo.stop();
        out.disconnect();
      }, 260);
    },
  };
};

/** The cutter closing: a short, bright zip with a rough edge. */
export const playTear = (): void => {
  const audio = context();
  if (!audio) return;

  const duration = 0.5;
  const source = audio.createBufferSource();
  const buffer = noiseBuffer(audio, duration);
  // roughen the noise so it rips rather than hisses: random-walk the amplitude
  const data = buffer.getChannelData(0);
  let walk = 1;
  for (let i = 0; i < data.length; i++) {
    if (i % 220 === 0) walk = 0.45 + Math.random() * 0.55;
    data[i] *= walk;
  }
  source.buffer = buffer;

  // the tear brightens as the fibres part
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(900, audio.currentTime);
  filter.frequency.exponentialRampToValueAtTime(5200, audio.currentTime + 0.26);
  filter.frequency.exponentialRampToValueAtTime(1400, audio.currentTime + duration);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, audio.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);

  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
  source.stop(audio.currentTime + duration);
};

/** A single soft click, for the moment the cut completes. */
export const playCut = (): void => {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1800, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(420, audio.currentTime + 0.05);
  gain.gain.setValueAtTime(0.09, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.1);
};
