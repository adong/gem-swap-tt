/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.GS_TITLE, // the name lives in js/title.js
  button: { top: 'var(--kh-top)' }, // index.html moves it (and the language button) to a corner on tall screens
  keys: [
    ['move the frame', '← ↑ → ↓ or W A S D'],
    ['pick a gem · put it down', 'Space or Enter'],
    ['swap the picked gem that way', '← ↑ → ↓ or W A S D'],
    ['call your brother (2 players: high five)', 'T'],
    ['this level again', 'R'],
    ['pause · sound', 'P or Esc · M'],
    ['menu: play', 'Enter'],
    ['menu: 1 player · a friend · 2 players', '1 · 2 · 3'],
    ['menu: Teddy or Tommy · level', 'W · L'],
    ['menu: the starting level', '← → or ↑ ↓'],
  ],
  note: 'Swap two gems side by side to make 3 or more of the same fruit in a row. 4 in a row makes a rocket, an L or a T makes a bomb, 5 in a row makes a rainbow star. Finish the goals at the top!',
  touch: "Slide a gem onto its neighbour, or tap one gem and then the one next to it. Tap your brother's face (bottom right) and he points at a match.",
});
Kit.lang.setup({ button: { top: 'var(--kl-top)' } });
