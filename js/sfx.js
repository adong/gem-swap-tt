/* TT Gem Swap: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files), from TT Tile Link.
   GS.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap, and nothing plays while the sound is off (Kit.sound's mute). */
(function () {
  'use strict';
  const GS = (window.GS = window.GS || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);
  const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760]; // a pentatonic climb (C D E G A C' D' E' G' A')
  let lastLand = 0;

  GS.sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // a gem picked up
    pick() { tone({ type: 'triangle', f: 880, to: 1175, dur: 0.07, vol: 0.07 }); },
    // the keyboard's frame moves
    step() { tone({ type: 'square', f: 1500, dur: 0.02, vol: 0.02, lp: 3000 }); },
    // two gems slide past each other
    swap() { hiss({ filter: 'bandpass', f: 900, to: 2600, q: 1.2, dur: 0.16, vol: 0.06 }); },
    // the swap made no line: a soft "uh-uh" as they slide back
    nope() {
      tone({ type: 'sine', f: 392, to: 370, dur: 0.12, vol: 0.08, at: 0.17 });
      tone({ type: 'sine', f: 330, to: 311, dur: 0.16, vol: 0.08, at: 0.31 });
    },
    // a line pops: a chime up the scale, higher each step of the cascade (连击)
    match(combo = 1) {
      const s = Math.min(combo - 1, 6);
      [0, 2, 4].forEach((d, i) => tone({ type: 'triangle', f: PENTA[s + d] || 1760, at: i * 0.05, dur: 0.16, vol: 0.085 }));
      hiss({ filter: 'highpass', f: 5000, dur: 0.08, vol: 0.03 });
    },
    // a new special appears
    special(sp) {
      const top = sp === 'r' ? 2093 : sp === 'b' ? 1319 : 1568;
      tone({ type: 'sine', f: top / 2, to: top, dur: 0.3, vol: 0.08 });
      [0, 1, 2].forEach((i) => tone({ type: 'triangle', f: top * (1 + i * 0.25), at: 0.12 + i * 0.06, dur: 0.12, vol: 0.05 }));
    },
    // a rocket streaks across
    rocket() {
      hiss({ filter: 'bandpass', f: 600, to: 6000, q: 0.9, dur: 0.3, vol: 0.09 });
      tone({ type: 'sawtooth', f: 220, to: 1760, dur: 0.25, vol: 0.04, lp: 2500 });
    },
    // a bomb: a soft round boom
    bomb() {
      tone({ type: 'sine', f: 140, to: 50, dur: 0.45, vol: 0.18 });
      hiss({ filter: 'lowpass', f: 1400, to: 200, dur: 0.4, vol: 0.12 });
    },
    // a rainbow: a sparkle that runs up
    rainbow() {
      [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.045, dur: 0.22, vol: 0.05 }));
      hiss({ filter: 'highpass', f: 7000, dur: 0.6, vol: 0.04 });
    },
    // ice cracks
    ice() {
      hiss({ filter: 'bandpass', f: 4200, q: 3, dur: 0.06, vol: 0.09 });
      tone({ type: 'triangle', f: 2637, to: 2349, dur: 0.09, vol: 0.04, at: 0.02 });
    },
    // gems land (no more than one tick every 40 ms)
    land() {
      const now = performance.now();
      if (now - lastLand < 40) return;
      lastLand = now;
      tone({ type: 'sine', f: 330, to: 220, dur: 0.05, vol: 0.035 });
    },
    // no move left: a whoosh and a rattle
    shuffle() {
      hiss({ filter: 'bandpass', f: 600, to: 3000, q: 0.8, dur: 0.5, vol: 0.08 });
      for (let i = 0; i < 6; i++) tone({ type: 'triangle', f: 900 + i * 140, at: 0.05 + i * 0.07, dur: 0.05, vol: 0.04 });
    },
    // a goal is done
    goal() { [784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.07, dur: 0.18, vol: 0.08 })); },
    // whose turn it is (2 players, or a friend)
    turn() { tone({ type: 'triangle', f: 659, to: 784, dur: 0.12, vol: 0.06 }); },
    // your brother's help: a magic sparkle
    peek() {
      [1319, 1568, 1976, 2637].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.05, dur: 0.25, vol: 0.06 }));
      hiss({ filter: 'highpass', f: 7000, dur: 0.5, vol: 0.04 });
    },
    // the level is won: a fanfare
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.1, dur: 0.2, vol: 0.09 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.45, dur: 0.8, vol: 0.07 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.45, dur: 0.5, vol: 0.05 });
    },
    // out of moves, or the friend won: a soft wah-wah, never harsh
    lose() { [392, 370, 349, 311].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.22, dur: i === 3 ? 0.5 : 0.22, vol: 0.08 })); },
    // your brother pops in (and out)
    pop() {
      tone({ f: 300, to: 900, dur: 0.12, vol: 0.1 });
      hiss({ f: 2000, to: 6000, dur: 0.15, vol: 0.05 });
    },
    // the high five: a clap
    clap() {
      hiss({ filter: 'bandpass', f: 1500, q: 0.8, dur: 0.09, vol: 0.22 });
      hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.1, at: 0.01 });
    },
  };
})();
