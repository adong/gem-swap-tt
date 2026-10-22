/* TT Gem Swap: the game. The menu, the three ways to play, moves, the HUD, input, your brother, the loop.
   - 1 PLAYER: 40 levels, each with goals (a score, so many of a fruit, all the ice broken). 🔥 NORMAL has a move
     limit (out of moves = TRY AGAIN); 🐣 EASY has none and counts your moves for the stars.
   - VS FROGGY (🐣) / VS FOXY (🔥): you and the friend take turns on one board, 10 moves each; the bigger score wins.
   - 2 PLAYERS: Teddy and Tommy take turns the same way.
   window.game is a test hook: see the README. */
(function () {
  'use strict';
  const GS = window.GS;
  const R = GS.rules;
  const ST = GS.stage;
  const S = Kit.sound;
  const $ = (id) => document.getElementById(id);
  const { rand } = Kit.gfx;

  const KEY = 'gemSwapTT.v1';
  const ZCH = 1.4; // the boys stand this far in front of the board
  const TILT = 0.16; // and lean back a little, so we see them a bit from above
  const TURN_MOVES = 10; // a turn game: moves each
  const CPUS = {
    easy: { id: 'froggy', emoji: '🐸', name: 'FROGGY', color: '#3fb950', think: [1.6, 2.6], smart: 0.45 },
    normal: { id: 'foxy', emoji: '🦊', name: 'FOXY', color: '#ff6b2c', think: [1.1, 1.9], smart: 0.85 },
  };
  const NAMES = { teddy: 'TEDDY', tommy: 'TOMMY', foxy: 'FOXY', froggy: 'FROGGY' };
  const nameOf = (id) => NAMES[id] || String(id).toUpperCase();
  const IDLE_HINT = { easy: 6, normal: 15 }; // seconds without a move before two gems wiggle by themselves
  const COMBO_WORDS = ['', '', 'NICE!', 'GREAT!', 'SUPER!', 'AMAZING!', 'FANTASTIC!'];
  const SPECIAL_WORDS = { h: 'ROCKET!', v: 'ROCKET!', b: 'BOMB!', r: 'RAINBOW!' };
  const BONUS_PER_MOVE = 60; // 🔥 NORMAL: points for each move left when the goals are done

  const prefs = Object.assign(
    { mode: 'solo', who: 'teddy', levels: { teddy: 'easy', tommy: 'easy', two: 'easy' }, start: {}, reached: {}, best: {} },
    load(),
  );
  const G = {
    state: 'boot', mode: 'solo', who: 'teddy', diff: 'easy', lv: 1, level: null, b: null, got: null, used: 0, turn: 0, sides: null,
    gen: 0, timers: [], held: false, last: 0, keyboard: false, cursor: -1, sel: -1, drag: null, idle: 0, hintBy: null, result: null,
    wide: true, demo: null, wins: { easy: [0, 0], normal: [0, 0], two: [0, 0] }, moving: false, goalsDone: null, cpuT: -1, cpuMove: null,
    pausedFrom: null, seed: 0, newBest: false, moves: 0, shuffles: 0, specials: 0, bestCombo: 0, lastRes: null,
  };
  const boys = { teddy: GS.makeActor(), tommy: GS.makeActor() };
  const pilots = {};
  let ui = null, flyers = null, bursts = null, art = null, view = null, spots = null;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch (e) { /* private mode: the progress just isn't kept */ }
  }
  const ctxKey = () => (prefs.mode === 'two' ? 'two' : prefs.who);
  const diffNow = () => prefs.levels[ctxKey()] || 'easy';
  const progKey = (who = prefs.who, diff = diffNow()) => `${who}:${diff}`;
  const reachedNow = () => Math.max(1, Math.min(40, prefs.reached[progKey()] || 1));
  const startNow = () => Math.max(1, Math.min(reachedNow(), prefs.start[progKey()] || reachedNow()));
  const bestOf = (lv, who = G.who, diff = G.diff) => prefs.best[`${who}:${diff}:${lv}`] || null;

  // ---------------------------------------------------------------- who's playing

  function side(id, human) {
    const actor = human || id === 'teddy' || id === 'tommy' ? boys[id] : pilots[id];
    return { id, name: nameOf(id), human, actor, score: 0, moves: 0 };
  }
  const turnSide = () => (G.sides ? G.sides[G.mode === 'solo' ? 0 : G.turn] : null);
  const humanTurn = () => {
    const s = turnSide();
    return !!(s && s.human);
  };
  const kid = () => G.sides[0];

  // ---------------------------------------------------------------- layout

  // Where the board and the boys go, in screen pixels, inside `area`.
  function arrange(area) {
    const out = {};
    const callH = ui.callBtn.getBoundingClientRect().height || 90;
    const W = ST.W;
    if (G.state === 'home' || G.state === 'boot' || !G.sides) {
      // the title: the little board, the player beside it
      const sideW = Math.max(70, Math.min(260, area.w * (G.wide ? 0.36 : 0.3)));
      out.board = { x: area.x + sideW, y: area.y, w: area.w - sideW, h: area.h };
      const h = Math.min(area.h * 0.5, sideW * 1.2);
      const pair = prefs.mode !== 'solo';
      out.L = { x: area.x + sideW * (pair ? 0.36 : 0.55), feet: area.y + area.h * 0.86, h };
      out.R = { x: area.x + sideW * 0.86, feet: area.y + area.h * 0.9, h: h * 0.95 };
      out.B = out.R;
      return out;
    }
    const two = G.sides.length === 2;
    if (G.wide) {
      const sideW = Math.max(84, Math.min(300, area.w * (two ? 0.18 : 0.25)));
      const rightW = two ? sideW : Math.min(150, callH + 24);
      out.board = { x: area.x + sideW, y: area.y, w: area.w - sideW - rightW, h: area.h };
      const h = Math.min(area.h * 0.42, sideW * 1.3);
      const feet = area.y + area.h * 0.94;
      out.L = { x: area.x + sideW * (two ? 0.5 : 0.32), feet, h };
      out.B = { x: area.x + sideW * (two ? 0.98 : 0.76), feet: feet + h * 0.04, h: h * 0.95 };
      out.R = { x: area.x + area.w - rightW * 0.5, feet: Math.min(area.y + area.h * 0.62, ST.H - callH - 40), h: h * 0.9 };
    } else {
      // the boys in a strip along the bottom
      const strip = Math.max(100, Math.min(200, area.h * 0.2));
      out.board = { x: area.x, y: area.y, w: area.w, h: area.h - strip };
      const h = strip * 0.92, feet = area.y + area.h - 6;
      out.L = { x: area.x + Math.max(90, area.w * 0.28), feet, h };
      out.B = { x: area.x + Math.max(150, area.w * 0.48), feet, h: h * 0.95 };
      out.R = { x: Math.min(area.x + area.w * 0.66, W - callH - 50), feet, h: h * 0.95 };
    }
    return out;
  }

  function layout() {
    ST.resize();
    GS.fx.overlay.resize();
    const W = ST.W, H = ST.H;
    G.wide = W / H >= 1.15;
    document.body.dataset.tall = G.wide ? '0' : '1';
    let area;
    if (G.state === 'home' || G.state === 'boot') {
      area = G.wide ? { x: 56, y: 10, w: W * 0.48 - 66, h: H - 20 } : { x: 56, y: 8, w: W - 64, h: H * 0.4 - 14 };
    } else {
      const top = ui.hudtop.getBoundingClientRect().bottom + 8;
      area = G.wide ? { x: 56, y: top, w: W - 56 - 10, h: H - top - 10 } : { x: 8, y: top, w: W - 16, h: H - top - 6 };
    }
    spots = arrange(area);
    view.fit(spots.board);
    placeActors();
  }

  // a spot in pixels -> where an actor stands in the world, and his scale (a boy is about 2.1 tall, a friend 3.4)
  function spotWorld(sp, tall = 2.1) {
    const p = ST.toWorld(sp.x, sp.feet, ZCH);
    const s = (sp.h * ST.kAt(ZCH)) / tall;
    return { x: p.x, y: p.y, z: ZCH, scale: s };
  }
  function placeActors() {
    if (!spots) return;
    const show = new Set();
    const put = (actor, sp, isPilot) => {
      const w = spotWorld(sp, isPilot ? 3.4 : 2.1);
      actor.place(w.x, w.y, w.z);
      actor.setScale(w.scale);
      actor.visible = true;
      show.add(actor);
    };
    if (G.state === 'home' || G.state === 'boot' || !G.sides) {
      if (prefs.mode === 'two') {
        put(boys.teddy, spots.L);
        put(boys.tommy, spots.R);
      } else if (prefs.mode === 'vs') {
        put(boys[prefs.who], spots.L);
        put(pilots[CPUS[diffNow()].id], spots.R, true);
      } else put(boys[prefs.who], spots.L);
    } else {
      put(G.sides[0].actor, spots.L);
      if (G.sides[1]) put(G.sides[1].actor, spots.R, !G.sides[1].human);
    }
    for (const a of [boys.teddy, boys.tommy, ...Object.values(pilots)]) if (!show.has(a)) a.visible = false;
    GS.buddy.relayout();
  }
  const actorScale = () => (spots ? spotWorld(spots.L).scale : 1);

  // ---------------------------------------------------------------- timers

  function after(secs, fn) {
    G.timers.push({ t: secs, fn, gen: G.gen });
  }
  function runTimers(dt) {
    const due = [];
    for (const tm of G.timers) {
      tm.t -= dt;
      if (tm.t <= 0) due.push(tm);
    }
    if (!due.length) return;
    G.timers = G.timers.filter((tm) => tm.t > 0);
    for (const tm of due) if (tm.gen === G.gen) tm.fn();
  }

  // ---------------------------------------------------------------- a game

  // start({ mode, who, level ('easy' | 'normal'), lv, seed })
  function startGame(opts = {}) {
    if (opts.mode) prefs.mode = opts.mode;
    if (opts.who) prefs.who = opts.who;
    if (opts.level) prefs.levels[ctxKey()] = opts.level;
    save();
    G.gen++;
    G.timers = [];
    GS.highFive.cancel();
    GS.buddy.dismiss();
    GS.fx.overlay.clear();
    flyers.clear();
    bursts.clear();
    G.mode = prefs.mode;
    G.who = G.mode === 'two' ? 'teddy' : prefs.who;
    G.diff = diffNow();
    G.lv = opts.lv ? Math.max(1, Math.min(40, opts.lv)) : startNow();
    G.seed = opts.seed || (Math.random() * 1e9) | 0;
    if (G.mode === 'solo') G.sides = [side(G.who, true)];
    else if (G.mode === 'vs') G.sides = [side(G.who, true), side(CPUS[G.diff].id, false)];
    else G.sides = [side('teddy', true), side('tommy', true)];
    for (const a of [boys.teddy, boys.tommy, ...Object.values(pilots)]) {
      a.react('idle');
      a.drop();
    }
    G.state = 'play';
    screen('play');
    startBoard();
    if (G.mode !== 'two') GS.buddy.setFor(G.who);
    hudMode();
    updateHud(true);
    layout();
    S.music('play');
  }

  function startBoard() {
    G.gen++;
    G.timers = [];
    G.used = 0;
    G.turn = 0;
    G.got = { points: 0, counts: [0, 0, 0, 0, 0, 0] };
    G.goalsDone = new Set();
    G.sel = -1;
    G.cursor = G.keyboard ? Math.floor((G.mode === 'solo' ? 3.5 : 3) * 8) : -1;
    G.drag = null;
    G.idle = 0;
    G.hintBy = null;
    G.moving = false;
    G.result = null;
    G.newBest = false;
    G.cpuT = -1;
    G.cpuMove = null;
    G.moves = G.shuffles = G.specials = G.bestCombo = 0;
    for (const s of G.sides) {
      s.score = 0;
      s.moves = 0;
    }
    if (G.mode === 'solo') G.level = R.level(G.lv, G.diff);
    else {
      const easy = G.diff === 'easy';
      G.level = { n: 0, diff: G.diff, rows: easy ? 7 : 8, cols: easy ? 7 : 8, kinds: easy ? 5 : 6, moves: TURN_MOVES, limit: TURN_MOVES, goals: [], ice: null };
    }
    G.b = R.deal(G.level, G.seed);
    G.seed = (G.seed * 1103515245 + 12345) & 0x7fffffff;
    view.setBoard(G.b);
    if (G.cursor >= 0) G.cursor = Math.min(G.cursor, G.b.cells.length - 1);
    view.cursor(G.cursor);
    hideOverlays();
    drawGoals();
    if (G.mode !== 'solo') after(0.6, () => turnToast());
    else after(0.5, () => toast(G.lv === 1 && G.mode === 'solo' ? 'SWAP TWO GEMS!' : `LEVEL ${G.lv}`, 'turn'));
  }

  const canMove = () => G.state === 'play' && !G.moving && !view.busy() && humanTurn();

  // Swap a and c (neighbours): the rules work it out, the board plays it.
  function tryMove(a, c) {
    if (G.state !== 'play' || G.moving || view.busy()) return 'busy';
    if (!R.adjacent(G.b, a, c)) return 'far';
    const who = turnSide();
    G.sel = -1;
    view.select(-1);
    view.hint(null);
    G.hintBy = null;
    G.idle = 0;
    const res = R.move(G.b, a, c);
    G.lastRes = res;
    if (!res.ok) {
      if (res.phases.length) view.play(res.phases, { onPhase: (p) => p.type === 'swap' && (GS.sfx.swap(), GS.sfx.nope()) });
      if (who.actor) who.actor.react('oops');
      return 'nope';
    }
    G.moving = true;
    G.moves++;
    if (G.mode === 'solo') G.used++;
    who.moves++;
    updateHud();
    view.play(res.phases, {
      onPhase: (p) => phaseFx(p, who),
      onLand: () => GS.sfx.land(),
      onDone: () => afterMove(res, who),
    });
    return 'ok';
  }

  function phaseFx(p, who) {
    if (p.type === 'swap') return GS.sfx.swap();
    if (p.type === 'shuffle') {
      G.shuffles++;
      GS.sfx.shuffle();
      return toast('NO MOVES LEFT! SHUFFLE!', 'shuffle');
    }
    if (p.type !== 'clear') return;
    GS.sfx.match(p.combo);
    G.bestCombo = Math.max(G.bestCombo, p.combo);
    const sounds = new Set(p.blasts.map((b) => (b.sp === 'h' || b.sp === 'v' || b.sp === 'x' || b.sp === 'X3' ? 'rocket' : b.sp === 'r' ? 'rainbow' : 'bomb')));
    if (p.rainbow) sounds.add('rainbow');
    for (const s of sounds) GS.sfx[s]();
    if (p.ice.length) GS.sfx.ice();
    for (const m of p.made) {
      G.specials++;
      GS.sfx.special(m.sp);
      const w = view.worldOf(m.i);
      bursts.add(SPECIAL_WORDS[m.sp], w.x, w.y + 0.6 * view.scale, w.z + 2, 1.7 * view.scale);
    }
    if (p.combo >= 2) {
      const word = COMBO_WORDS[Math.min(p.combo, COMBO_WORDS.length - 1)];
      const c = view.worldOf(Math.floor(G.b.rows / 2) * G.b.cols + Math.floor(G.b.cols / 2));
      bursts.add(word, c.x + rand(-1, 1) * view.scale, c.y + rand(-1, 1) * view.scale, c.z + 3, 2.6 * view.scale);
      toast(`COMBO x${p.combo}!`, 'combo');
      if (who.actor) who.actor.react('cheer');
      GS.buddy.cheer();
    } else if (who.actor && who.actor.isPilot) who.actor.react('hop');
    // the points and the goals
    who.score += p.points;
    if (G.mode === 'solo') {
      G.got.points += p.points;
      p.counts.forEach((n, k) => (G.got.counts[k] += n));
      const gs = R.goalState(G.level, G.got, G.b);
      gs.list.forEach((g, ix) => {
        if (g.done && !G.goalsDone.has(ix)) {
          G.goalsDone.add(ix);
          if (!gs.done) {
            toast(`${goalEmoji(g)} DONE!`, 'goal');
            GS.sfx.goal();
          }
        }
      });
      drawGoals();
    }
    updateHud(false, G.mode === 'solo' ? 0 : G.turn);
  }

  function afterMove(res, who) {
    if (G.state !== 'play') return;
    G.moving = false;
    if (G.mode === 'solo') {
      const gs = R.goalState(G.level, G.got, G.b);
      if (gs.done) return winLevel();
      if (G.level.limit && G.used >= G.level.limit) return outOfMoves();
      if (G.level.limit && G.level.limit - G.used === 3) toast('3 MOVES LEFT!', 'nope');
      return;
    }
    if (G.sides.every((s) => s.moves >= TURN_MOVES)) return finishTurns();
    G.turn = 1 - G.turn;
    turnToast();
    updateHud();
  }

  function turnToast() {
    const s = turnSide();
    if (!s || G.state !== 'play') return;
    GS.sfx.turn();
    toast(s.human && G.mode === 'vs' ? 'YOUR TURN!' : `${s.name}'S TURN!`, 'turn');
    if (s.actor) s.actor.react('hop');
    G.cpuT = s.human ? -1 : rand(...CPUS[G.diff].think);
    G.cpuMove = null;
    G.idle = 0;
  }

  // ---------------------------------------------------------------- the friend's moves (a turn game)

  function cpuUpdate(dt) {
    if (G.mode !== 'vs' || G.state !== 'play' || humanTurn() || G.moving || view.busy() || G.cpuT < 0) return;
    const cpu = CPUS[G.diff], s = turnSide();
    G.cpuT -= dt;
    if (!G.cpuMove && G.cpuT < 0.8) {
      // he's found one: show it for a moment
      const moves = R.allMoves(G.b);
      G.cpuMove = Math.random() < cpu.smart ? R.bestMove(G.b) : moves[Math.floor(Math.random() * moves.length)];
      view.hint(G.cpuMove);
      s.actor.act('think', 0.8);
    }
    if (G.cpuT <= 0 && G.cpuMove) {
      const m = G.cpuMove;
      G.cpuT = -1;
      G.cpuMove = null;
      tryMove(m[0], m[1]);
    }
  }

  // ---------------------------------------------------------------- the end of a level or a turn game

  function winLevel() {
    G.state = 'over';
    const lv = G.level, left = lv.limit ? lv.limit - G.used : 0;
    const bonus = left * BONUS_PER_MOVE;
    if (bonus) {
      G.got.points += bonus;
      kid().score += bonus;
      after(0.3, () => toast(`BONUS +${bonus}`, 'goal'));
    }
    const stars = R.stars(G.used, lv.moves);
    const key = `${G.who}:${G.diff}:${G.lv}`;
    const was = prefs.best[key];
    G.newBest = !was || G.got.points > was.score;
    prefs.best[key] = { score: Math.max(was ? was.score : 0, G.got.points), stars: Math.max(was ? was.stars : 0, stars) };
    const pk = progKey(G.who, G.diff);
    prefs.reached[pk] = Math.max(prefs.reached[pk] || 1, Math.min(40, G.lv + 1));
    prefs.start[pk] = Math.min(40, G.lv + 1);
    save();
    G.result = { kind: 'win', stars, score: G.got.points, moves: G.used, bonus, best: prefs.best[key].score, newBest: G.newBest, last: G.lv >= 40 };
    celebrate(kid());
    updateHud();
    after(1.7, showResult);
  }

  function outOfMoves() {
    G.state = 'over';
    const gs = R.goalState(G.level, G.got, G.b);
    G.result = { kind: 'lose', score: G.got.points, moves: G.used, left: gs.list.filter((g) => !g.done) };
    kid().actor.react('sulk');
    GS.sfx.lose();
    S.music('over');
    toast('OUT OF MOVES!', 'nope');
    after(1.4, showResult);
  }

  function finishTurns() {
    G.state = 'over';
    const [a, c] = G.sides;
    const winner = a.score === c.score ? null : a.score > c.score ? a : c;
    const wk = G.mode === 'two' ? 'two' : G.diff;
    if (winner) G.wins[wk][G.sides.indexOf(winner)]++;
    G.result = { kind: 'turns', winner: winner ? winner.id : null, scores: [a.score, c.score], wins: G.wins[wk].slice() };
    if (winner) {
      celebrate(winner);
      const loser = winner === a ? c : a;
      if (loser.human && G.mode === 'vs') loser.actor.react('sulk');
      else loser.actor.react(loser.human ? 'cheer' : 'shrug');
    } else {
      for (const s of G.sides) s.actor.react('cheer');
      GS.sfx.win();
      GS.fx.overlay.rain(60);
      S.music('over');
    }
    if (winner && !winner.human) GS.sfx.lose();
    after(1.8, showResult);
  }

  // the winner's signature move, then confetti
  function celebrate(s) {
    s.actor.react('over');
    if (s.human) {
      GS.sfx.win();
      after(0.5, () => {
        GS.fx.overlay.rain(110);
        const r = view.screenRect();
        GS.fx.overlay.burst((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 40, ['💎', '⭐', '🍓', '🍋', '🍇'], 1.2);
      });
    }
    S.music('over');
  }

  function goalEmoji(g) {
    return g.type === 'collect' ? R.FRUIT[g.k] : g.type === 'ice' ? '❄️' : '🏆';
  }

  function showResult() {
    const r = G.result;
    if (!r) return;
    const face = (id) => (art[id] && (id === 'teddy' || id === 'tommy') ? `<img src="${art[id]}" class="${id}" alt="">` : `<div class="emoface">${art.emoji[id] || '🙂'}</div>`);
    ui.oStars.innerHTML = '';
    ui.oBest.className = 'rbest';
    ui.oBest.textContent = '';
    ui.oSub.innerHTML = '';
    const sub = (word, n) => {
      const el = document.createElement('span');
      const w = document.createElement('span');
      w.textContent = word;
      const b = document.createElement('b');
      b.textContent = ` ${n}`;
      el.append(w, b);
      ui.oSub.appendChild(el);
    };
    if (r.kind === 'win') {
      ui.oFace.innerHTML = face(G.who);
      ui.oTitle.textContent = r.last ? 'ALL 40 LEVELS DONE!' : `LEVEL ${G.lv} CLEAR!`;
      for (let i = 0; i < 3; i++) {
        const st = document.createElement('i');
        st.textContent = '⭐';
        st.className = i < r.stars ? '' : 'off';
        st.style.animationDelay = `${0.15 + i * 0.18}s`;
        ui.oStars.appendChild(st);
      }
      sub('SCORE', r.score);
      sub('MOVES', r.moves);
      if (r.newBest) {
        ui.oBest.textContent = 'NEW BEST!';
        ui.oBest.className = 'rbest new';
      } else {
        ui.oBest.textContent = 'BEST';
        const b = document.createElement('b');
        b.textContent = ` ${r.best}`;
        ui.oBest.appendChild(b);
      }
      ui.oAgainWord.textContent = 'PLAY AGAIN';
      ui.oNext.classList.toggle('gone', r.last);
    } else if (r.kind === 'lose') {
      ui.oFace.innerHTML = face(G.who);
      ui.oTitle.textContent = 'OUT OF MOVES!';
      for (const g of r.left) {
        const el = document.createElement('span');
        el.textContent = g.type === 'score' ? `🏆 ${g.n - g.have}` : `${goalEmoji(g)} ${g.type === 'ice' ? g.have : g.n - g.have}`;
        ui.oSub.appendChild(el);
      }
      ui.oBest.textContent = 'SO CLOSE! TRY AGAIN!';
      ui.oAgainWord.textContent = 'TRY AGAIN';
      ui.oNext.classList.add('gone');
    } else {
      const [a, c] = G.sides;
      ui.oFace.innerHTML = r.winner ? face(r.winner) : face(a.id) + face(c.id);
      ui.oTitle.textContent = r.winner ? `${nameOf(r.winner)} WINS!` : 'A TIE!';
      sub(a.name, r.scores[0]);
      sub(c.name, r.scores[1]);
      ui.oBest.textContent = 'GAMES WON';
      const b = document.createElement('b');
      b.dataset.noLang = '';
      b.textContent = ` ${a.name} ${r.wins[0]} · ${c.name} ${r.wins[1]}`;
      ui.oBest.appendChild(b);
      ui.oAgainWord.textContent = 'PLAY AGAIN';
      ui.oNext.classList.add('gone');
    }
    show(ui.gameOver, true);
  }

  function next() {
    if (G.mode === 'solo' && G.result && G.result.kind === 'win' && G.lv < 40) {
      G.lv++;
      return again(true);
    }
    again();
  }
  function again(keepLv = false) {
    if (!G.sides) return;
    void keepLv;
    G.state = 'play';
    for (const s of G.sides) {
      s.actor.react('idle');
      s.actor.drop();
    }
    GS.highFive.cancel();
    GS.buddy.dismiss();
    GS.fx.overlay.clear();
    G.seed = (Math.random() * 1e9) | 0;
    startBoard();
    updateHud(true);
    layout();
    S.music('play');
  }

  // ---------------------------------------------------------------- your brother

  const buddyApi = {
    get flyers() { return flyers; },
    tilt: TILT,
    scale: () => actorScale(),
    spot() {
      const w = spotWorld(spots.B);
      return { x: w.x, y: w.y, z: ZCH + 0.3 };
    },
    player: () => kid().actor,
    toast: (t, c) => toast(t, c),
    over: () => G.state !== 'play' || !G.sides,
    canPeek: () => G.state === 'play' && !G.moving && !view.busy() && humanTurn(),
    peek() {
      const m = R.bestMove(G.b, wantNow());
      if (!m) return null;
      G.sel = -1;
      view.select(-1);
      view.hint(m);
      G.hintBy = 'buddy';
      const w = view.worldOf(m[0]);
      return { pair: m.slice(), emoji: matchEmoji(m), dx: w.x - GS.buddy.actor.root.position.x };
    },
    players: () => (G.sides || []).map((s) => s.actor),
    meet() {
      const [a, c] = G.sides.map((s) => s.actor.root.position);
      const mid = (a.x + c.x) / 2, gap = 0.55 * actorScale();
      return [{ x: mid - gap, z: a.z }, { x: mid + gap, z: c.z }];
    },
    homes() {
      const a = spotWorld(spots.L), c = spotWorld(spots.R);
      return [{ x: a.x, y: a.y, z: ZCH }, { x: c.x, y: c.y, z: ZCH }];
    },
  };
  // what the hint should go for: fruit the level still wants, and ice
  function wantNow() {
    if (G.mode !== 'solo' || !G.level) return null;
    const want = { kinds: {}, ice: false };
    for (const g of R.goalState(G.level, G.got, G.b).list) {
      if (g.done) continue;
      if (g.type === 'collect') want.kinds[g.k] = 1;
      if (g.type === 'ice') want.ice = true;
    }
    return want;
  }
  // the fruit a move lines up (or ⭐ for a special's combo)
  function matchEmoji(m) {
    const b = G.b, ga = b.cells[m[0]], gc = b.cells[m[1]];
    if (ga.sp === 'r' || gc.sp === 'r' || (ga.sp && gc.sp)) return '⭐';
    R.swapCells(b, m[0], m[1]);
    const k = R.lineAt(b, m[1]) ? R.kindAt(b, m[1]) : R.kindAt(b, m[0]);
    R.swapCells(b, m[0], m[1]);
    return R.FRUIT[k] || '💎';
  }

  // T, or the face button: call your brother (1 player, a friend) or a high five (2 players)
  function call() {
    if (G.state !== 'play') return 'not now';
    if (G.mode === 'two') return GS.highFive.start();
    return GS.buddy.call();
  }

  // ---------------------------------------------------------------- the title's little board

  function demoStart() {
    const spec = { rows: 6, cols: 6, kinds: 5 };
    G.demo = { b: R.deal(spec, (Math.random() * 1e9) | 0), t: 1.2 };
    view.setBoard(G.demo.b);
  }
  function demoUpdate(dt) {
    const d = G.demo;
    if (!d || view.busy()) return;
    d.t -= dt;
    if (d.t > 0) return;
    d.t = 1.5;
    const m = R.bestMove(d.b);
    if (!m) return;
    const res = R.move(d.b, m[0], m[1]);
    const a = boys[prefs.mode === 'two' ? 'teddy' : prefs.who];
    view.play(res.phases, {
      onPhase: (p) => {
        if (p.type === 'clear' && p.combo >= 2) {
          a.react('cheer');
          const c = view.worldOf(Math.floor(d.b.rows / 2) * d.b.cols + Math.floor(d.b.cols / 2));
          bursts.add(COMBO_WORDS[Math.min(p.combo, COMBO_WORDS.length - 1)], c.x, c.y, c.z + 3, 2.4 * view.scale);
        }
      },
    });
  }

  // ---------------------------------------------------------------- screens

  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }
  function hideOverlays() {
    show(ui.gameOver, false);
    show(ui.pause, false);
  }
  function screen(name) {
    document.body.dataset.screen = name;
    show(ui.home, name === 'home');
    show(ui.hud, name === 'play');
    show(ui.callBtn, name === 'play');
    if (name !== 'play') hideOverlays();
  }

  function goHome() {
    G.gen++;
    G.timers = [];
    GS.highFive.cancel(); // before the players leave
    G.state = 'home';
    G.sides = null;
    G.moving = false;
    GS.buddy.dismiss();
    GS.fx.overlay.clear();
    screen('home');
    for (const a of [boys.teddy, boys.tommy, ...Object.values(pilots)]) {
      a.react('idle');
      a.drop();
    }
    syncMenu();
    layout();
    demoStart();
    layout();
    S.music('title');
  }

  // the menu shows the picks
  function syncMenu() {
    const mark = (seg, v) => {
      for (const b of seg.children) {
        b.classList.toggle('on', b.dataset.v === v);
        b.setAttribute('aria-checked', b.dataset.v === v ? 'true' : 'false');
        b.setAttribute('role', 'radio');
      }
    };
    mark(ui.segMode, prefs.mode);
    mark(ui.segWho, prefs.who);
    mark(ui.segLevel, diffNow());
    const cpu = CPUS[diffNow()];
    ui.vsEmo.textContent = cpu.emoji;
    ui.vsWord.textContent = `VS ${cpu.name}`;
    ui.segWho.style.display = prefs.mode === 'two' ? 'none' : '';
    ui.duo.style.display = prefs.mode === 'two' ? '' : 'none';
    const solo = prefs.mode === 'solo';
    ui.lvPick.style.display = solo ? '' : 'none';
    const lv = startNow(), top = reachedNow();
    ui.lvWord.textContent = `LEVEL ${lv}`;
    const best = prefs.best[`${prefs.who}:${diffNow()}:${lv}`];
    ui.lvStars.textContent = best ? '⭐'.repeat(best.stars) : '';
    ui.lvDown.disabled = lv <= 1;
    ui.lvUp.disabled = lv >= top;
  }
  function setPref(k, v) {
    if (k === 'level') prefs.levels[ctxKey()] = v;
    else prefs[k] = v;
    save();
    syncMenu();
    placeActors();
    GS.sfx.pick();
  }
  function stepLevel(d) {
    prefs.start[progKey()] = Math.max(1, Math.min(reachedNow(), startNow() + d));
    save();
    syncMenu();
    GS.sfx.step();
  }

  // ---------------------------------------------------------------- HUD and toasts

  function hudMode() {
    const solo = G.mode === 'solo';
    ui.score1.classList.toggle('gone', !solo);
    ui.score2.classList.toggle('gone', solo);
    ui.goals.classList.toggle('gone', !solo);
  }

  function updateHud(fresh = false, bumped = -1) {
    if (!G.sides) return;
    const solo = G.mode === 'solo';
    if (fresh) {
      if (G.mode === 'two') {
        ui.callFace.style.display = 'none';
        ui.callBtn.setAttribute('aria-label', 'High five!');
        ui.callBtn.title = 'High five! (T)';
        ui.callEmoji.textContent = '🙌';
      } else {
        ui.callFace.style.display = '';
        ui.callFace.src = art[Kit.roster.buddyFor(G.who)];
        ui.callBtn.setAttribute('aria-label', 'Call your brother');
        ui.callBtn.title = 'Call your brother (T)';
        ui.callEmoji.textContent = '';
      }
      if (solo) {
        ui.face1.src = art[G.who];
        ui.face1.className = G.who;
      } else {
        const [a, c] = G.sides;
        ui.faceL.src = art[a.id];
        ui.faceL.className = a.id;
        ui.faceR.src = art[c.id];
        ui.faceR.className = c.human ? c.id : 'cpu';
      }
    }
    if (solo) {
      ui.lv1.textContent = G.lv;
      const lim = G.level.limit;
      ui.moves1.textContent = lim ? Math.max(0, lim - G.used) : G.used;
      ui.movesWord.textContent = lim ? 'MOVES LEFT' : 'MOVES';
      ui.movesChip.classList.toggle('low', !!lim && lim - G.used <= 3);
      setNum(ui.pts1, G.got.points, bumped === 0);
      const best = bestOf(G.lv);
      ui.best1.textContent = Math.max(best ? best.score : 0, G.state === 'over' && G.result && G.result.kind === 'win' ? G.got.points : 0);
    } else {
      const [a, c] = G.sides;
      setNum(ui.scoreL, a.score, bumped === 0);
      setNum(ui.scoreR, c.score, bumped === 1);
      ui.leftL.textContent = TURN_MOVES - a.moves;
      ui.leftR.textContent = TURN_MOVES - c.moves;
      ui.sideL.classList.toggle('turn', G.state === 'play' && G.turn === 0);
      ui.sideR.classList.toggle('turn', G.state === 'play' && G.turn === 1);
    }
  }
  function drawGoals() {
    if (G.mode !== 'solo' || !G.level) {
      ui.goals.innerHTML = '';
      return;
    }
    const gs = R.goalState(G.level, G.got, G.b);
    if (ui.goals.children.length !== gs.list.length) {
      ui.goals.innerHTML = '';
      for (const g of gs.list) {
        const el = document.createElement('div');
        el.className = 'goal';
        const e = document.createElement('span');
        e.className = 'emo';
        e.textContent = goalEmoji(g);
        const b = document.createElement('b');
        el.append(e, b);
        el.title = g.type === 'score' ? 'Score this much' : g.type === 'ice' ? 'Break all the ice' : 'Collect this many';
        ui.goals.appendChild(el);
      }
    }
    gs.list.forEach((g, i) => {
      const el = ui.goals.children[i];
      el.classList.toggle('done', g.done);
      el.querySelector('b').textContent = g.type === 'score' ? g.n : g.type === 'ice' ? g.have : Math.max(0, g.n - g.have);
    });
  }
  function setNum(el, v, bump) {
    if (el.textContent !== String(v)) {
      el.textContent = v;
      if (bump) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
    }
  }

  function toast(text, cls = '') {
    const el = document.createElement('div');
    el.className = `toast ${cls}`;
    el.textContent = text;
    ui.toasts.appendChild(el);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => el.remove(), cls === 'save' ? 2900 : 2000);
  }

  // ---------------------------------------------------------------- input

  function moveCursor(dr, dc) {
    if (G.state !== 'play' || !G.b) return;
    G.keyboard = true;
    if (G.sel >= 0) {
      // a gem is picked: the arrow swaps it that way
      const r = Math.floor(G.sel / G.b.cols) + dr, c = (G.sel % G.b.cols) + dc;
      if (r < 0 || c < 0 || r >= G.b.rows || c >= G.b.cols) return;
      if (!canMove()) return;
      const to = r * G.b.cols + c;
      G.cursor = to;
      view.cursor(to);
      tryMove(G.sel, to);
      return;
    }
    if (G.cursor < 0) G.cursor = Math.floor(G.b.rows / 2) * G.b.cols + Math.floor(G.b.cols / 2);
    else {
      const r = Math.max(0, Math.min(G.b.rows - 1, Math.floor(G.cursor / G.b.cols) + dr));
      const c = Math.max(0, Math.min(G.b.cols - 1, (G.cursor % G.b.cols) + dc));
      G.cursor = r * G.b.cols + c;
    }
    view.cursor(G.cursor);
    GS.sfx.step();
  }
  function keyPick() {
    if (G.state !== 'play' || !G.b) return;
    G.keyboard = true;
    if (G.cursor < 0) return moveCursor(0, 0);
    if (G.sel >= 0) {
      G.sel = -1;
      view.select(-1);
      return;
    }
    if (!canMove()) return;
    G.sel = G.cursor;
    view.select(G.sel);
    GS.sfx.pick();
  }
  // a tap or a click on cell i
  function tapCell(i) {
    if (i < 0 || !canMove()) return 'busy';
    if (G.sel === i) {
      G.sel = -1;
      view.select(-1);
      return 'dropped';
    }
    if (G.sel >= 0 && R.adjacent(G.b, G.sel, i)) return tryMove(G.sel, i);
    G.sel = i;
    view.select(i);
    GS.sfx.pick();
    return 'picked';
  }

  function bindInput() {
    const firstGesture = () => S.init();
    addEventListener('pointerdown', firstGesture, { capture: true });
    addEventListener('keydown', firstGesture, { capture: true });

    ui.goPlay.addEventListener('click', () => startGame({}));
    for (const [seg, k] of [[ui.segMode, 'mode'], [ui.segWho, 'who'], [ui.segLevel, 'level']]) {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) setPref(k, b.dataset.v);
      });
    }
    ui.lvDown.addEventListener('click', () => stepLevel(-1));
    ui.lvUp.addEventListener('click', () => stepLevel(1));
    ui.pauseBtn.addEventListener('click', () => pause(true));
    ui.muteBtn.addEventListener('click', toggleMute);
    ui.callBtn.addEventListener('click', call);
    ui.oNext.addEventListener('click', next);
    ui.oAgain.addEventListener('click', () => again());
    ui.oHome.addEventListener('click', goHome);
    ui.pResume.addEventListener('click', () => pause(false));
    ui.pRestart.addEventListener('click', () => {
      pause(false);
      again();
    });
    ui.pHome.addEventListener('click', goHome);

    ui.canvas.addEventListener('pointerdown', (e) => {
      if (G.state !== 'play' || !G.sides) return;
      const i = view.cellAt(e.clientX, e.clientY);
      if (i < 0) return;
      G.keyboard = false;
      G.cursor = -1;
      view.cursor(-1);
      const wasSel = G.sel;
      const r = tapCell(i);
      G.drag = r === 'picked' || (r === 'busy' && wasSel < 0) ? { i, x: e.clientX, y: e.clientY } : null;
      if (r === 'busy') G.drag = null;
    });
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && G.state === 'play' && G.sides) {
        const i = view.cellAt(e.clientX, e.clientY);
        view.hover(canMove() ? i : -1);
        ui.canvas.style.cursor = i >= 0 && canMove() ? 'pointer' : '';
      }
      const d = G.drag;
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < view.px * 0.35) return;
      G.drag = null;
      const r = Math.floor(d.i / G.b.cols), c = d.i % G.b.cols;
      const [dr, dc] = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= G.b.rows || nc >= G.b.cols) return;
      tryMove(d.i, nr * G.b.cols + nc);
    });
    addEventListener('pointerup', () => (G.drag = null));
    addEventListener('pointercancel', () => (G.drag = null));
    ui.canvas.addEventListener('pointerleave', () => view.hover(-1));

    addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (Kit.help && Kit.help.isOpen && Kit.help.isOpen()) return;
      const k = e.key.toLowerCase();
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
      if (k === 'm') return toggleMute();
      if (G.state === 'home') {
        if (k === 'enter' || k === ' ') startGame({});
        else if (k === '1') setPref('mode', 'solo');
        else if (k === '2') setPref('mode', 'vs');
        else if (k === '3') setPref('mode', 'two');
        else if (k === 'w') setPref('who', prefs.who === 'teddy' ? 'tommy' : 'teddy');
        else if (k === 'l') setPref('level', diffNow() === 'easy' ? 'normal' : 'easy');
        else if ((k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') && prefs.mode === 'solo') stepLevel(k === 'arrowup' || k === 'arrowright' ? 1 : -1);
        return;
      }
      if (G.state === 'paused') {
        if (k === 'escape' || k === 'p' || k === 'enter' || k === ' ') pause(false);
        else if (k === 'r') {
          pause(false);
          again();
        }
        return;
      }
      if (G.state === 'over') {
        if (!G.result || ui.gameOver.classList.contains('hidden')) return;
        if (k === 'enter' || k === ' ') next();
        else if (k === 'r') again();
        else if (k === 'escape') goHome();
        return;
      }
      if (G.state !== 'play') return;
      if (k === 'p' || k === 'escape') return pause(true);
      if (k === 't') return call();
      if (k === 'r') return again();
      const dirs = { w: [-1, 0], a: [0, -1], s: [1, 0], d: [0, 1], arrowup: [-1, 0], arrowleft: [0, -1], arrowdown: [1, 0], arrowright: [0, 1] };
      if (dirs[k]) moveCursor(...dirs[k]);
      else if (k === ' ' || k === 'enter') keyPick();
    });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
    Kit.lang.onChange(() => {
      syncMenu();
      updateHud(true);
      if (G.state === 'over' && G.result && !ui.gameOver.classList.contains('hidden')) showResult();
    });
  }

  function pause(on) {
    if (on && (G.state === 'play' || G.state === 'over')) {
      G.pausedFrom = G.state;
      G.state = 'paused';
      show(ui.gameOver, false);
      show(ui.pause, true);
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = G.pausedFrom || 'play';
      show(ui.pause, false);
      if (G.state === 'over' && G.result) show(ui.gameOver, true);
      S.music(G.state === 'over' ? 'over' : 'play');
    }
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the loop

  function step(dt, draw = true) {
    dt = Math.min(dt, 0.1);
    if ((innerWidth || 1) !== ST.W || (innerHeight || 1) !== ST.H) layout();
    const running = G.state !== 'paused' && G.state !== 'boot';
    if (running) {
      if (G.state === 'home') demoUpdate(dt);
      if (G.state === 'play') {
        cpuUpdate(dt);
        // a long think: two gems wiggle by themselves (sooner on 🐣 EASY)
        if (canMove() && !view.hintPair) {
          G.idle += dt;
          if (G.idle > IDLE_HINT[G.diff]) {
            const m = R.bestMove(G.b, wantNow());
            if (m) {
              view.hint(m);
              G.hintBy = 'idle';
            }
          }
        }
      }
      runTimers(dt);
      view.update(dt);
      flyers.update(dt);
      bursts.update(dt);
      for (const a of [boys.teddy, boys.tommy, ...Object.values(pilots)]) if (a.visible) a.update(dt);
      GS.buddy.update(dt);
      GS.highFive.update(dt);
    }
    GS.fx.overlay.update(dt);
    ui.callBtn.classList.toggle('here', GS.buddy.on || GS.highFive.on);
    if (draw) ST.render();
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot

  // a friend's face for the HUD and the result: the emoji on a round tile (the boys' come from Kit.portraits)
  function emojiFace(emoji) {
    const [c, g] = Kit.gfx.makeCanvas(160, 160);
    g.font = `112px ${Kit.gfx.EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, 80, 90);
    return c.toDataURL('image/png');
  }

  function boot() {
    const ids = [
      'home', 'hud', 'logo', 'goPlay', 'segMode', 'segWho', 'segLevel', 'duo', 'duoA', 'duoB', 'vsEmo', 'vsWord', 'lvPick', 'lvDown', 'lvUp',
      'lvWord', 'lvStars', 'pauseBtn', 'muteBtn', 'score1', 'face1', 'lv1', 'moves1', 'movesWord', 'movesChip', 'pts1', 'best1', 'score2',
      'sideL', 'sideR', 'faceL', 'faceR', 'scoreL', 'scoreR', 'leftL', 'leftR', 'goals', 'callBtn', 'callFace', 'callEmoji', 'toasts',
      'gameOver', 'oFace', 'oTitle', 'oStars', 'oSub', 'oBest', 'oNext', 'oAgain', 'oAgainWord', 'oHome', 'pause', 'pResume', 'pRestart', 'pHome',
    ];
    ui = { canvas: $('game'), hudtop: document.querySelector('.hudtop') };
    for (const id of ids) ui[id] = $(id);
    // the logo: "TT" small on top, the rest big
    const words = window.GS_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.length > 1 ? words[0] : '';
    ui.logo.querySelector('big').textContent = words.length > 1 ? words.slice(1).join(' ') : words[0];
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    ST.init(ui.canvas);
    GS.fx.overlay.init($('fx'));
    view = ST.makeView();
    flyers = GS.fx.flyers(ST.scene, 90);
    bursts = GS.fx.bursts(ST.scene, 6);
    view.flyers = flyers;
    for (const id of ['teddy', 'tommy']) {
      boys[id].attach(ST.scene, flyers);
      boys[id].set(id, 1);
      boys[id].root.rotation.x = TILT;
      const tag = Kit.gfx.nameTag(nameOf(id), (Kit.roster.get(id) || {}).tag || '#2f7cf0');
      tag.position.y = 2.75;
      boys[id].person.root.add(tag);
    }
    for (const c of Object.values(CPUS)) {
      const p = GS.makePilot(c.id, c.emoji, c.name, c.color);
      p.attach(ST.scene, flyers);
      p.root.rotation.x = TILT;
      p.visible = false;
      pilots[c.id] = p;
    }
    art = Kit.portraits(['teddy', 'tommy'].map((id) => Kit.roster.get(id)), { size: 160 });
    art.emoji = {};
    for (const c of Object.values(CPUS)) {
      art[c.id] = emojiFace(c.emoji);
      art.emoji[c.id] = c.emoji;
    }
    for (const b of ui.segWho.children) b.querySelector('img').src = art[b.dataset.v];
    ui.duoA.src = art.teddy;
    ui.duoB.src = art.tommy;
    GS.buddy.init(buddyApi);
    bindInput();
    goHome();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook

  function info() {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width ? { x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) } : null;
    };
    const gs = G.mode === 'solo' && G.level && G.got && G.b ? R.goalState(G.level, G.got, G.b) : null;
    return {
      state: G.state, mode: G.mode, who: G.who, diff: G.diff, lv: G.lv, used: G.used, limit: G.level && G.level.limit, turn: G.turn,
      score: G.got && G.got.points, goals: gs && gs.list, goalsDone: gs && gs.done, busy: view.busy(), moving: G.moving,
      sides: G.sides && G.sides.map((s) => ({ id: s.id, human: s.human, score: s.score, moves: s.moves, pose: s.actor.pose })),
      sel: G.sel, cursor: G.cursor, hint: view.hintPair && view.hintPair.slice(), hintBy: G.hintBy, moves: G.moves, shuffles: G.shuffles,
      specials: G.specials, bestCombo: G.bestCombo, result: G.result, buddy: GS.buddy.info(), board: view.screenRect(), cellPx: Math.round(view.px),
      panel: !ui.gameOver.classList.contains('hidden') ? 'over' : !ui.pause.classList.contains('hidden') ? 'pause' : null,
      kitButtons: [rect($('kit-help-btn')), rect($('kit-lang-btn')), rect($('kit-sound-btn'))],
      callBtn: rect(ui.callBtn), hud: rect(ui.hudtop),
    };
  }

  // play good moves until the level (or the turn game) is over, `secs` of game time between them
  function autoPlay(maxMoves = 200, secs = 0.2) {
    for (let guard = 0; guard < maxMoves * 40 && G.state === 'play'; guard++) {
      game.step(secs);
      if (!canMove()) continue;
      const m = R.bestMove(G.b, wantNow());
      if (m) tryMove(m[0], m[1]);
    }
    game.step(0.5);
    return info();
  }

  window.game = {
    // advance `secs` of game time in 1/60 s steps, drawing only the last (works while the pane is hidden)
    step(secs = 0.1) {
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60, i === n - 1);
      return info();
    },
    hold(on = true) { G.held = on; },
    // start({ mode: 'solo' | 'vs' | 'two', who: 'teddy' | 'tommy', level: 'easy' | 'normal', lv, seed })
    start(opts = {}) {
      startGame(opts);
      return info();
    },
    home: () => goHome(),
    // swap cells a and c, as a drag would; tap(i) taps one cell
    swap: (a, c) => tryMove(a, c),
    tap: (i) => tapCell(i),
    key: (k) => dispatchEvent(new KeyboardEvent('keydown', { key: k })),
    call: () => call(),
    pause: (on = true) => pause(on),
    again: () => again(),
    next: () => next(),
    autoPlay,
    // a good move on the board, and the board itself (for scripted tests)
    hint: () => R.bestMove(G.b, wantNow()),
    board: () => G.b,
    screenOf: (i) => view.screenOf(i),
    check: (opts = {}) => GS.check(opts),
    checkCanFail: (opts = {}) => GS.checkCanFail(opts),
    info,
    get G() { return G; },
    get R() { return R; },
    get prefs() { return prefs; },
    get view() { return view; },
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
