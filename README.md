# TT Gem Swap

[![TT Gem Swap title screen](docs/screenshot.jpg)](https://adong.github.io/gem-swap-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 消消乐！把挨着的两颗水果宝石换一换，三个一样的连成一排就消掉（三消），掉下来的宝石还能接着消（连击）。4 个变火箭，拐弯变炸弹，5 个变彩虹星。40 关，每关有任务：拿到分数、消掉水果、打碎冰块。简单没有步数限制，普通有步数。还可以和 🐸 Froggy 或 🦊 Foxy 轮流比分数，或者 Teddy 和 Tommy 两个人比。

A swap-and-match game (消消乐, "match and clear!") starring Teddy and Tommy, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. The gems are glossy fruit on a dark velvet tray, each fruit its own colour and its own shape, so the colour is never the only clue. There are no image, model or audio files: the boys are the kit's blocky characters, Froggy and Foxy are emoji on podiums, every gem is a Three.js shape with its fruit painted on a canvas, and every sound is synthesised.

The name lives in one constant, `GS_TITLE` in `js/title.js`; the page title, the logo and the ? panel read it from there.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/gem-swap-tt.html` is the whole game in one page. AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name gem-swap-tt`

## How to play

- **Swap two gems side by side** (slide one onto its neighbour, or tap one and then the next) to line up **3 or more of the same fruit**, across or down. They pop, the gems above drop into the gaps, new gems fall in from the top, and any new lines pop too: a **cascade** (连击), worth more points at every step (×2, ×3…) with a word for it (NICE! GREAT! SUPER! AMAZING!).
- **A swap that makes no line** slides back with a soft "uh-uh" and costs no move.
- **The gems:** 🍓 a red heart, 🍊 an orange circle, 🍋 a yellow square, 🍏 a green hexagon, 🫐 a blue diamond, 🍇 a purple star.
- **No move left?** The board says "NO MOVES LEFT! SHUFFLE!" and mixes itself (the ice stays put) into a board with no lines and at least one move. A new board never starts with a line already made, and always has a move.

### Special gems

- **4 in a line → a rocket** 🚀: stripes and two arrows pointing the way the line was. Line it up again and it streaks across its whole row (or column).
- **An L or a T → a bomb** 💣: a glowing ring. It clears the 3 × 3 round it.
- **5 in a line → a rainbow star** 🌈: swap it with any gem and every gem of that fruit goes.
- The new special appears where the gem you moved landed. Specials set each other off.
- **Swap two specials together:** rocket + rocket = a cross (its row and its column), rocket + bomb = three rows and three columns, bomb + bomb = a 5 × 5 blast, rainbow + rocket or bomb = every gem of that fruit turns into one and goes off, rainbow + rainbow = the whole board.

### Levels and goals (1 PLAYER)

- **40 levels**, each with goals at the top of the screen: 🏆 **a score**, **so many of a fruit** (🍓 12 counts down to 0), or ❄️ **all the ice broken** (the pale tiles under the gems; a line through an iced cell cracks one layer, and later levels have double ice with ❄️ in the corners). A goal turns green with a ✓ when it's done; all of them done wins the level.
- **🐣 EASY** (the default, for Tommy, 5): no move limit, a 7 × 7 board with 4 fruit (5 from level 11), smaller goals and one layer of ice. After 6 seconds without a move, two gems wiggle toward each other to show one.
- **🔥 NORMAL** (for Teddy, 8): an 8 × 8 board with 5 fruit (6 from level 11) and a move limit; the moves left are a 60-point bonus each. Out of moves means **TRY AGAIN**. The idle wiggle waits 15 seconds.
- **Stars:** ⭐⭐⭐ for the level in 70 % of its moves or fewer, ⭐⭐ within its moves, ⭐ for more (EASY only). Your best score and stars are kept per player, level and difficulty, and the menu's ◀ LEVEL ▶ lets you start on any level you've reached.
- The move limits come from a bot (`node tools/levels.js`): it plays the move that looks best at a glance two times in three and a random one the third, like a kid; it wins every NORMAL level inside the limit 60–100 % of the time.

### Modes

- **1 PLAYER:** the levels.
- **VS 🐸 FROGGY** (EASY) **/ VS 🦊 FOXY** (NORMAL): you and the friend take turns on one board, **10 moves each**, and the bigger score wins. Froggy picks the best-looking move about half the time, Foxy most of the time; each shows his pick with a glow for a moment before he swaps. GAMES WON keeps count.
- **2 PLAYERS:** Teddy and Tommy take turns the same way on one board ("TOMMY'S TURN!"), sharing the screen.
- **The winner** does his signature move beside the board (Teddy's boxing combo or his 🏀 jump shot, Tommy's Y with ✌️; Froggy and Foxy spin), with confetti, then **PLAY AGAIN** (or **NEXT LEVEL**).

## Controls

| | Keys | Touch |
|---|---|---|
| move the frame | ← ↑ → ↓ or W A S D | |
| pick a gem · put it down | Space or Enter | tap it |
| swap the picked gem that way | ← ↑ → ↓ or W A S D | tap its neighbour, or slide the gem |
| call your brother (2 players: high five) | T | his face, bottom right (🙌 in 2 players) |
| this level again | R | 🔄 in the pause menu |
| pause · sound | P or Esc · M | ⏸️ · 🔊 (top corners) |
| menu: play | Enter | PLAY |
| menu: 1 player · a friend · 2 players | 1 · 2 · 3 | the buttons |
| menu: Teddy or Tommy · level | W · L | the buttons |
| menu: the starting level | ← → or ↑ ↓ | ◀ ▶ |

In 2 players both sets of keys move the one frame; whoever's turn it is plays. The mouse lifts the gem under it a little. The kit's ? and A文 buttons sit in the middle of the left edge (on a tall screen in a game, the bottom left corner; on a tall screen's title, the top left), beside the board, never on it.

## Companion

- **1 player and against a friend:** press **T** or tap your brother's face (bottom right) any time, as often as you like. The other brother (`Kit.roster.buddyFor`: Tommy for Teddy, Teddy for Tommy) pops in beside you at his `buddyScale` in a puff of stars ("TOMMY'S HERE!"), does his signature move (Tommy's Y with ✌️, Teddy's boxing or jump shot), and tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌), which you then hold.
- **Then he points at a match:** two gems glow and wiggle toward each other with ↔️ between them: "TOMMY SAYS: SWAP THESE 🍓!". It's the best-looking move on the board (going for the fruit and the ice the level still wants), and it glows until you make a move. Against a friend he waits for your turn.
- He stays a few seconds to cheer your cascades, then does his goodbye move and pops out. Calling him again while he's there brings another hello, another treat and another match.
- **2 players:** both brothers are already there, so T (or 🙌) is a **high five**: they run together, jump, slap hands (💥 🙌) and run back. It doesn't change the game.

## Checks

`node tools/check.js` (half a second; the page runs the same as `game.check()`) checks the three rules the brief asks for, with its own scans written separately from the game's:

- **no starting matches:** 320 deals (every level, EASY and NORMAL, 4 deals each): no line of 3 by the check's own scan, a move by trying every swap, the ice where the level put it.
- **a move always exists or the board reshuffles:** four hand-made dead boards (4 × 4 to 6 × 6, 3 to 6 fruit) come back mixed with no line, a move, the very same gems and the ice unmoved; 60 bot games (1,800 moves, best and random) end every move on a full board with no line and a move.
- **cascades are right:** two hand-worked cascades land exactly where they should (a bottom row clears, the rest drop, a new row drops in and clears too: 2 steps, 6 gems, 90 points, the board ACA/CDB/BBD; a line of 4 leaves a row-rocket where the moved gem landed); a rocket in a line takes its row and cracks the ice under it; a rocket that moves away doesn't go off; the blasts have the right shapes; 400 random moves agree gem for gem with a second cascade written in the check (find lines, clear, drop, refill from the same list of new fruit); and every bot move's phases, replayed one at a time the way the screen plays them, add up to the same board, with every column keeping its order and no gaps.
- **It can fail:** `node tools/check.js --can-fail` (or `game.checkCanFail()`) plants six bugs one at a time and every one is caught: `startMatch` (deals may start with a line), `noReshuffle` (a dead board stays dead), `shuffleMatches` (a shuffle that doesn't check its result), `gravityGap` (gems drop only one row), `noCascade` (the cascade stops after the first step), `iceStuck` (ice never cracks). One at a time: `node tools/check.js --sabotage gravityGap`.

### Test hooks

```js
game.start({ mode: 'vs', who: 'tommy', level: 'easy', lv: 3, seed: 7 }) // mode solo | vs | two
game.step(1)          // advance 1 s of game time (works while the tab is hidden)
game.hint()           // the best-looking move: [cell, cell]; game.board() is the rules' board
game.swap(a, b)       // swap two neighbouring cells, as a slide would; game.tap(cell) taps one
game.call() · game.pause() · game.again() · game.next()
game.autoPlay()       // play good moves until the level (or the turn game) is over
game.info()           // state, level, moves, score, goals, sides, the buddy, the board rectangle and cell size, layout
game.check() · game.checkCanFail()
```

`node tools/shoot.js tools/shots.json docs 1200 750` takes `docs/screenshot.jpg` with headless Chrome (serve `~/claude-games` first; `URL=...` picks the address). `node tools/levels.js` prints how the bot does on every level.

## Files

```
index.html       the page: the menu, the HUD (score, moves, goals, turns), the panels, the icon
js/title.js      the name
js/rules.js      matching, specials, cascades, dealing, reshuffles, the 40 levels and goals (no drawing: node runs it too)
js/check.js      the headless check and its sabotages
js/stage.js      the 3D board: gem shapes, ice, swaps, pops, drops, blasts, the hint, the keyboard frame, screen <-> world
js/actor.js      the boys, Froggy and Foxy (from TT Tile Link)
js/buddy.js      your brother's visit and his match, the 2-player high five (from TT Tile Link)
js/fx.js         flying emoji, word bursts, confetti (from TT Tile Link)
js/sfx.js        the sounds: a chime up a pentatonic scale for each cascade step, rocket zips, bomb booms, ice cracks
js/game.js       the menu, the levels, the turn games, the friend's moves, the HUD, input, the loop, window.game
js/keys.js       the ? panel
js/zh.js         中文
tools/           check.js, levels.js, shoot.js, shots.json
```

## Not verified

- Sound: every test ran muted; no sound was listened to (every effect was called once after `Kit.sound.init()` with no errors).
- Real touch devices (iPad, phones, iOS Safari): layouts were checked at 1067×800, 768×1024, 390×844 and 740×360 in the Browser pane and at 1200×750 in headless Chrome, and slides and taps were sent as pointer events, but no real finger played it.
- Whether the levels suit the real Teddy and Tommy: the move limits come from a bot, not the kids; NORMAL's 8 × 8 board on a phone held sideways has 33 px gems.
- Speed on an old iPad, double-click from Finder (both pages were opened from file:// in headless Chrome only), the iPad home-screen icon.
- Emoji fonts: 🫐 is Emoji 13, which needs iOS 14 or newer.
