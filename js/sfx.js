/* TT Tile Link: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   TL.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap, and nothing plays while the sound is off (Kit.sound's mute). */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);
  let lastClack = 0;
  const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319]; // a pentatonic climb (C D E G A C' D' E')

  TL.sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // a tile picked up: the click of a mahjong tile
    pick() {
      hiss({ filter: 'bandpass', f: 3200, q: 2.5, dur: 0.04, vol: 0.12 });
      tone({ type: 'triangle', f: 880, to: 1100, dur: 0.06, vol: 0.06 });
    },
    // put back down
    drop() {
      hiss({ filter: 'bandpass', f: 2200, q: 2.5, dur: 0.035, vol: 0.08 });
      tone({ type: 'triangle', f: 660, to: 520, dur: 0.05, vol: 0.05 });
    },
    // tiles knocking together as they're dealt or shuffled (no more than one every 25 ms)
    clack(i = 0) {
      const now = performance.now();
      if (now - lastClack < 25) return;
      lastClack = now;
      hiss({ filter: 'bandpass', f: 2600 + (i % 5) * 300, q: 3, dur: 0.03, vol: 0.07 });
    },
    // a link! the path zips, then a chime up the pentatonic scale, higher for each link in a row
    link(streak = 1) {
      hiss({ filter: 'bandpass', f: 1200, to: 5200, q: 1.2, dur: 0.18, vol: 0.06 });
      const s = Math.min(streak - 1, 4);
      [0, 2, 4].forEach((d, i) => tone({ type: 'triangle', f: PENTA[s + d] || 1568, at: 0.08 + i * 0.06, dur: 0.18, vol: 0.1 }));
    },
    // the other player's (or the CPU's) link: softer
    theirLink() {
      [659, 880].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.06, dur: 0.12, vol: 0.06 }));
    },
    // two of the same that can't be joined: a soft "uh-uh"
    nope() {
      tone({ type: 'sine', f: 392, to: 370, dur: 0.12, vol: 0.09 });
      tone({ type: 'sine', f: 330, to: 311, dur: 0.16, vol: 0.09, at: 0.14 });
    },
    // the shuffle: a whoosh and a rattle of tiles
    shuffle() {
      hiss({ filter: 'bandpass', f: 600, to: 3000, q: 0.8, dur: 0.45, vol: 0.08 });
      for (let i = 0; i < 7; i++) hiss({ filter: 'bandpass', f: 2400 + i * 260, q: 3, dur: 0.03, vol: 0.06, at: 0.05 + i * 0.06 });
    },
    // the clock is nearly out
    tick() { tone({ type: 'square', f: 1200, dur: 0.03, vol: 0.03, lp: 3000 }); },
    // the keyboard's frame moves
    step() { tone({ type: 'square', f: 1500, dur: 0.02, vol: 0.02, lp: 3000 }); },
    // your brother's help: a magic sparkle
    peek() {
      [1319, 1568, 1976, 2637].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.05, dur: 0.25, vol: 0.06 }));
      hiss({ filter: 'highpass', f: 7000, dur: 0.5, vol: 0.04 });
    },
    // the board is clear: a little gong, then a fanfare
    win() {
      tone({ type: 'sine', f: 196, to: 180, dur: 1.4, vol: 0.12 });
      tone({ type: 'sine', f: 392, to: 370, dur: 0.9, vol: 0.05 });
      [523, 587, 659, 784, 880].forEach((f, i) => tone({ type: 'triangle', f: f * 2, at: 0.25 + i * 0.09, dur: 0.22, vol: 0.08 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.75, dur: 0.7, vol: 0.07 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.75, dur: 0.5, vol: 0.05 });
    },
    // the race is lost, or the clock ran out: a soft wah-wah, never harsh
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
    // the race's count-in
    count(go = false) { tone({ type: 'triangle', f: go ? 1047 : 523, dur: go ? 0.4 : 0.15, vol: 0.1 }); },
  };
})();
