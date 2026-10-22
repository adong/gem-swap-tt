/* TT Gem Swap: the rules, with no drawing. They run in the page and in node (tools/check.js).
   - A board is rows x cols cells, index i = r * cols + c, row 0 at the top. A cell holds a gem { id, k, sp } or null:
     k is the fruit (0..kinds-1), sp is 0 or a special: 'h' (a rocket that clears its row), 'v' (its column),
     'b' (a bomb: the 3 x 3 round it) or 'r' (a rainbow star: k is -1, it matches nothing, swap it with any gem).
   - ice[i] is how many layers of ice the cell has (0, 1 or 2); a gem cleared in that cell breaks one layer.
   - move(b, a, c) swaps two neighbours and works the whole thing out at once, as a list of phases for the screen
     to play: swap, then clear / fall pairs (each pair is one step of the cascade, 连击), then a shuffle if no move is
     left. A swap that makes no match (and isn't two specials or a rainbow) goes back: { ok: false }.
   - Matches: 3 in a line clear; 4 in a line make a rocket (pointing the way the line was); an L or T makes a bomb;
     5 in a line make a rainbow. The new special appears where the gem you moved landed (or in the line's middle).
   - Swapping two specials sets off a combo: rocket + rocket = a cross, rocket + bomb = 3 rows and 3 columns,
     bomb + bomb = 5 x 5; a rainbow clears every gem of the fruit it's swapped with (a special's fruit all turn into
     that special and go off), and two rainbows clear the whole board.
   - Spawns: new gems drop into each column, columns left to right, the lowest empty cell first. b.feed (a list of
     fruit) is used before the random numbers, so the check can replay a cascade exactly. */
(function (root) {
  'use strict';
  const GS = (root.GS = root.GS || {});

  const FRUIT = ['🍓', '🍊', '🍋', '🍏', '🫐', '🍇'];
  const NAMES = ['STRAWBERRY', 'ORANGE', 'LEMON', 'APPLE', 'BLUEBERRY', 'GRAPES'];
  const SPECIAL_POINTS = { h: 30, v: 30, b: 50, r: 80 };
  // the check plants one bug at a time here (js/check.js) to prove it notices
  const sab = { on: null };

  // ---------------------------------------------------------------- random numbers (a seed you can copy)

  function nextRand(b) {
    let t = (b.seed = (b.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const randInt = (b, n) => Math.floor(nextRand(b) * n);

  // ---------------------------------------------------------------- boards

  function blank(rows, cols, kinds, seed) {
    return { rows, cols, kinds, cells: new Array(rows * cols).fill(null), ice: new Array(rows * cols).fill(0), seed: seed | 0 || 1, nextId: 1, feed: null, noSpecials: false };
  }
  function newGem(b, k, sp = 0) {
    return { id: b.nextId++, k: sp === 'r' ? -1 : k, sp };
  }
  function spawnKind(b) {
    if (b.feed && b.feed.length) return b.feed.shift();
    return randInt(b, b.kinds);
  }
  const kindAt = (b, i) => {
    const g = b.cells[i];
    return g && g.sp !== 'r' ? g.k : -1;
  };
  function clone(b) {
    const c = Object.assign({}, b);
    c.cells = b.cells.map((g) => (g ? { id: g.id, k: g.k, sp: g.sp } : null));
    c.ice = b.ice.slice();
    c.feed = b.feed ? b.feed.slice() : null;
    return c;
  }

  // A new board for `spec` ({ rows, cols, kinds, ice: [...] }): no match anywhere, and at least one move.
  function deal(spec, seed) {
    const b = blank(spec.rows, spec.cols, spec.kinds, seed);
    if (spec.ice) b.ice = spec.ice.slice();
    for (let tries = 0; tries < 200; tries++) {
      b.cells.fill(null);
      fillNoMatch(b, b.cells.map((_, i) => i));
      if (hasMove(b)) return b;
    }
    shuffle(b); // never needed so far: 200 deals without a move
    return b;
  }

  // Fill `list` (cells, in reading order) with fruit that make no line of 3 with what's left of and above them.
  function fillNoMatch(b, list, keepIds = null) {
    const { cols } = b;
    for (const i of list) {
      const r = Math.floor(i / cols), c = i % cols;
      const bad = new Set();
      if (sab.on !== 'startMatch') {
        if (c >= 2 && kindAt(b, i - 1) >= 0 && kindAt(b, i - 1) === kindAt(b, i - 2)) bad.add(kindAt(b, i - 1));
        if (r >= 2 && kindAt(b, i - cols) >= 0 && kindAt(b, i - cols) === kindAt(b, i - 2 * cols)) bad.add(kindAt(b, i - cols));
        // and to the right / below, for a refill in the middle of a board
        if (c + 2 < cols && kindAt(b, i + 1) >= 0 && kindAt(b, i + 1) === kindAt(b, i + 2)) bad.add(kindAt(b, i + 1));
        if (c >= 1 && c + 1 < cols && kindAt(b, i - 1) >= 0 && kindAt(b, i - 1) === kindAt(b, i + 1)) bad.add(kindAt(b, i - 1));
        if (r + 2 < b.rows && kindAt(b, i + cols) >= 0 && kindAt(b, i + cols) === kindAt(b, i + 2 * cols)) bad.add(kindAt(b, i + cols));
        if (r >= 1 && r + 1 < b.rows && kindAt(b, i - cols) >= 0 && kindAt(b, i - cols) === kindAt(b, i + cols)) bad.add(kindAt(b, i - cols));
      }
      const ok = [];
      for (let k = 0; k < b.kinds; k++) if (!bad.has(k)) ok.push(k);
      const k = ok.length ? ok[randInt(b, ok.length)] : randInt(b, b.kinds);
      if (keepIds && b.cells[i]) b.cells[i].k = k;
      else b.cells[i] = newGem(b, k);
    }
  }

  // ---------------------------------------------------------------- lines of 3 or more

  function findRuns(b) {
    const { rows, cols } = b, runs = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; ) {
        const k = kindAt(b, r * cols + c);
        let e = c;
        if (k >= 0) while (e + 1 < cols && kindAt(b, r * cols + e + 1) === k) e++;
        if (k >= 0 && e - c >= 2) {
          const cells = [];
          for (let x = c; x <= e; x++) cells.push(r * cols + x);
          runs.push({ dir: 'h', k, cells });
        }
        c = e + 1;
      }
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; ) {
        const k = kindAt(b, r * cols + c);
        let e = r;
        if (k >= 0) while (e + 1 < rows && kindAt(b, (e + 1) * cols + c) === k) e++;
        if (k >= 0 && e - r >= 2) {
          const cells = [];
          for (let y = r; y <= e; y++) cells.push(y * cols + c);
          runs.push({ dir: 'v', k, cells });
        }
        r = e + 1;
      }
    }
    return runs;
  }

  // Runs that share a cell (an L, a T, a +) are one group.
  function findGroups(b) {
    const owner = new Map(), groups = [];
    for (const run of findRuns(b)) {
      const touch = new Set();
      for (const i of run.cells) if (owner.has(i)) touch.add(owner.get(i));
      let g;
      if (!touch.size) {
        g = { k: run.k, runs: [], cells: new Set(), dead: false };
        groups.push(g);
      } else {
        const list = [...touch];
        g = list[0];
        for (const o of list.slice(1)) {
          o.dead = true;
          for (const r of o.runs) g.runs.push(r);
          for (const i of o.cells) {
            g.cells.add(i);
            owner.set(i, g);
          }
        }
      }
      g.runs.push(run);
      for (const i of run.cells) {
        g.cells.add(i);
        owner.set(i, g);
      }
    }
    return groups.filter((g) => !g.dead).map((g) => ({ k: g.k, runs: g.runs, cells: [...g.cells] }));
  }

  // The special a group makes, and where: { sp, i } or null.
  function specialFor(b, g, prefer) {
    if (b.noSpecials) return null;
    let longest = null, h = false, v = false;
    for (const r of g.runs) {
      if (!longest || r.cells.length > longest.cells.length) longest = r;
      if (r.dir === 'h') h = true;
      else v = true;
    }
    const len = longest.cells.length;
    const sp = len >= 5 ? 'r' : h && v ? 'b' : len === 4 ? longest.dir : 0;
    if (!sp) return null;
    let i = -1;
    for (const p of prefer || []) if (g.cells.includes(p)) { i = p; break; }
    if (i < 0 && sp === 'b') {
      // where the lines cross
      const seen = new Map();
      for (const r of g.runs) for (const c of r.cells) seen.set(c, (seen.get(c) || 0) + 1);
      for (const [c, n] of seen) if (n > 1) { i = c; break; }
    }
    if (i < 0) i = longest.cells[Math.floor((len - 1) / 2)];
    return { sp, i };
  }

  // the cells a special's blast reaches (plus the combos' bigger blasts)
  function blastCells(b, i, sp) {
    const { rows, cols } = b, r0 = Math.floor(i / cols), c0 = i % cols, out = [];
    const box = (rad) => {
      for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) if (r >= 0 && c >= 0 && r < rows && c < cols) out.push(r * cols + c);
    };
    const row = (r) => { if (r >= 0 && r < rows) for (let c = 0; c < cols; c++) out.push(r * cols + c); };
    const col = (c) => { if (c >= 0 && c < cols) for (let r = 0; r < rows; r++) out.push(r * cols + c); };
    if (sp === 'h') row(r0);
    else if (sp === 'v') col(c0);
    else if (sp === 'b') box(1);
    else if (sp === 'B5') box(2);
    else if (sp === 'x') { row(r0); col(c0); }
    else if (sp === 'X3') for (let d = -1; d <= 1; d++) { row(r0 + d); col(c0 + d); }
    else if (sp === 'all') for (let j = 0; j < rows * cols; j++) out.push(j);
    else if (sp === 'r') {
      // a rainbow set off by a blast: the fruit there's most of
      const n = new Array(b.kinds).fill(0);
      for (let j = 0; j < b.cells.length; j++) if (kindAt(b, j) >= 0) n[kindAt(b, j)]++;
      let k = 0;
      for (let x = 1; x < n.length; x++) if (n[x] > n[k]) k = x;
      for (let j = 0; j < b.cells.length; j++) if (kindAt(b, j) === k) out.push(j);
    }
    return [...new Set(out)];
  }

  // ---------------------------------------------------------------- one step of the cascade

  // Clear the groups (and `extra` cells), set off every special they reach, break ice, make the new specials.
  function clearPhase(b, groups, o = {}) {
    const combo = o.combo || 1;
    const hit = new Set(o.extra || []);
    const made = [];
    for (const g of groups) {
      for (const i of g.cells) hit.add(i);
      const s = specialFor(b, g, o.prefer);
      if (s) made.push({ i: s.i, k: g.k, sp: s.sp });
    }
    const fired = new Set(o.consume || []);
    const blasts = [];
    const queue = [];
    for (const f of o.forced || []) {
      const cells = blastCells(b, f.i, f.sp);
      blasts.push({ i: f.i, sp: f.sp, k: -1, cells });
      for (const j of cells) hit.add(j);
    }
    for (const i of hit) if (b.cells[i] && b.cells[i].sp && !fired.has(i)) queue.push(i);
    while (queue.length) {
      const i = queue.shift();
      if (fired.has(i) || !b.cells[i]) continue;
      fired.add(i);
      const g = b.cells[i];
      const cells = blastCells(b, i, g.sp);
      blasts.push({ i, sp: g.sp, k: g.k, cells });
      for (const j of cells) {
        if (hit.has(j)) continue;
        hit.add(j);
        if (b.cells[j] && b.cells[j].sp && !fired.has(j)) queue.push(j);
      }
    }
    const removed = [], ice = [], counts = new Array(FRUIT.length).fill(0);
    for (const i of [...hit].sort((x, y) => x - y)) {
      const g = b.cells[i];
      if (!g) continue;
      removed.push({ id: g.id, i, k: g.k, sp: g.sp });
      if (g.k >= 0) counts[g.k]++;
      b.cells[i] = null;
      if (b.ice[i] > 0 && sab.on !== 'iceStuck') {
        b.ice[i]--;
        ice.push({ i, left: b.ice[i] });
      }
    }
    const madeGems = made.map((m) => {
      const g = newGem(b, m.k, m.sp);
      b.cells[m.i] = g;
      return { id: g.id, i: m.i, k: g.k, sp: g.sp };
    });
    let points = removed.length * 10 * combo;
    for (const m of madeGems) points += SPECIAL_POINTS[m.sp] || 0;
    return { type: 'clear', combo, removed, made: madeGems, blasts, ice, points, counts, convert: o.convert || [] };
  }

  // Gems drop down their column into the gaps; new ones drop in from above. No gaps afterwards.
  function fall(b) {
    const { rows, cols } = b, moves = [], spawns = [];
    for (let c = 0; c < cols; c++) {
      let w = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        const i = r * cols + c, g = b.cells[i];
        if (!g) continue;
        let to = w;
        if (sab.on === 'gravityGap' && w - r > 1) to = r + 1; // the bug: a gem only drops one row
        if (to !== r) {
          b.cells[to * cols + c] = g;
          b.cells[i] = null;
          moves.push({ id: g.id, from: i, to: to * cols + c });
        }
        w = to - 1;
      }
      // the gaps left at the top of the column (normally just rows 0..w)
      const gaps = [];
      for (let r = rows - 1; r >= 0; r--) if (!b.cells[r * cols + c]) gaps.push(r);
      const n = gaps.length;
      gaps.forEach((r, ix) => {
        const g = newGem(b, spawnKind(b));
        b.cells[r * cols + c] = g;
        spawns.push({ id: g.id, i: r * cols + c, k: g.k, sp: g.sp, drop: n });
        void ix;
      });
    }
    return { type: 'fall', moves, spawns };
  }

  // ---------------------------------------------------------------- moves

  const adjacent = (b, a, c) => {
    if (a < 0 || c < 0 || a >= b.cells.length || c >= b.cells.length || a === c) return false;
    const ra = Math.floor(a / b.cols), rc = Math.floor(c / b.cols);
    return (ra === rc && Math.abs(a - c) === 1) || (a % b.cols === c % b.cols && Math.abs(ra - rc) === 1);
  };
  function swapCells(b, a, c) {
    const t = b.cells[a];
    b.cells[a] = b.cells[c];
    b.cells[c] = t;
  }
  // a line of 3+ through cell i?
  function lineAt(b, i) {
    const k = kindAt(b, i);
    if (k < 0) return 0;
    const { cols, rows } = b, r = Math.floor(i / cols), c = i % cols;
    let h = 1, v = 1;
    for (let x = c - 1; x >= 0 && kindAt(b, r * cols + x) === k; x--) h++;
    for (let x = c + 1; x < cols && kindAt(b, r * cols + x) === k; x++) h++;
    for (let y = r - 1; y >= 0 && kindAt(b, y * cols + c) === k; y--) v++;
    for (let y = r + 1; y < rows && kindAt(b, y * cols + c) === k; y++) v++;
    return Math.max(h >= 3 ? h : 0, v >= 3 ? v : 0) + (h >= 3 && v >= 3 ? 2 : 0);
  }
  // would swapping a and c do something? (a match, two specials, or a rainbow)
  function wouldWork(b, a, c) {
    const ga = b.cells[a], gc = b.cells[c];
    if (!ga || !gc || !adjacent(b, a, c)) return false;
    if (ga.sp === 'r' || gc.sp === 'r') return true;
    if (ga.sp && gc.sp) return true;
    swapCells(b, a, c);
    const ok = lineAt(b, a) > 0 || lineAt(b, c) > 0;
    swapCells(b, a, c);
    return ok;
  }
  // every move that works, as [a, c] with c to the right of or below a
  function allMoves(b) {
    const out = [], { rows, cols } = b;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c + 1 < cols && wouldWork(b, i, i + 1)) out.push([i, i + 1]);
        if (r + 1 < rows && wouldWork(b, i, i + cols)) out.push([i, i + cols]);
      }
    }
    return out;
  }
  const hasMove = (b) => allMoves(b).length > 0;

  // How good a move looks at a glance (its first clear only, no cascade): for the hint, your brother and the CPU.
  // `want` (optional) weights fruit the level asks for, and ice.
  function rateMove(b, a, c, want) {
    const ga = b.cells[a], gc = b.cells[c];
    if (!wouldWork(b, a, c)) return -1;
    if (ga.sp === 'r' && gc.sp === 'r') return 200;
    if (ga.sp === 'r' || gc.sp === 'r') return 60 + (ga.sp && gc.sp ? 60 : 0);
    if (ga.sp && gc.sp) return 90;
    swapCells(b, a, c);
    const groups = findGroups(b);
    swapCells(b, a, c);
    let v = 0;
    for (const g of groups) {
      v += g.cells.length * 3;
      const s = specialFor(b, g, [c, a]);
      if (s) v += s.sp === 'r' ? 40 : s.sp === 'b' ? 20 : 14;
      for (const i of g.cells) {
        const gem = i === a ? gc : i === c ? ga : b.cells[i];
        if (gem && gem.sp) v += 25;
        if (want && want.kinds && want.kinds[g.k]) v += 4;
        if (want && want.ice && b.ice[i]) v += 6 * b.ice[i];
      }
    }
    // a little lower on the board stirs up more cascades
    v += (Math.floor(Math.max(a, c) / b.cols) / b.rows) * 2;
    return v;
  }
  function bestMove(b, want) {
    let best = null, bv = -1;
    for (const m of allMoves(b)) {
      const v = rateMove(b, m[0], m[1], want);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }

  // Swap a and c, and work out everything that follows. Changes b.
  function move(b, a, c) {
    if (!adjacent(b, a, c) || !b.cells[a] || !b.cells[c]) return { ok: false, why: 'far', phases: [] };
    const ga = b.cells[a], gc = b.cells[c];
    const swap = { type: 'swap', a, c, ida: ga.id, idc: gc.id, ok: true };
    swapCells(b, a, c); // ga is at c now, gc at a
    let first = null;
    if (ga.sp === 'r' || gc.sp === 'r') {
      if (ga.sp === 'r' && gc.sp === 'r') first = clearPhase(b, [], { forced: [{ i: c, sp: 'all' }], consume: [a, c] });
      else {
        const rain = ga.sp === 'r' ? c : a, other = ga.sp === 'r' ? gc : ga;
        const targets = [];
        for (let j = 0; j < b.cells.length; j++) if (kindAt(b, j) === other.k) targets.push(j);
        const convert = [];
        if (other.sp) {
          for (const j of targets) {
            const g = b.cells[j];
            const sp = other.sp === 'b' ? 'b' : nextRand(b) < 0.5 ? 'h' : 'v';
            if (g.sp !== sp) convert.push({ id: g.id, sp });
            g.sp = sp;
          }
        }
        first = clearPhase(b, [], { extra: [rain, ...targets], consume: [rain], convert });
        first.rainbow = { i: rain, k: other.k, targets };
      }
    } else if (ga.sp && gc.sp) {
      const sp = ga.sp === 'b' && gc.sp === 'b' ? 'B5' : ga.sp === 'b' || gc.sp === 'b' ? 'X3' : 'x';
      first = clearPhase(b, [], { forced: [{ i: c, sp }], extra: [a, c], consume: [a, c] });
    } else {
      const groups = findGroups(b);
      if (!groups.length) {
        swapCells(b, a, c);
        return { ok: false, why: 'nomatch', phases: [Object.assign({}, swap, { ok: false })] };
      }
      first = clearPhase(b, groups, { prefer: [c, a] });
    }
    const phases = [swap, first, fall(b)];
    settle(b, phases, 2);
    return summarize(phases);
  }

  // Keep clearing new lines (the cascade) until there are none, then make sure there's a move.
  function settle(b, phases, combo = 1) {
    for (let guard = 0; guard < 200; guard++) {
      if (sab.on === 'noCascade' && combo > 1) break;
      const groups = findGroups(b);
      if (!groups.length) break;
      phases.push(clearPhase(b, groups, { combo }));
      phases.push(fall(b));
      combo++;
    }
    if (!hasMove(b) && sab.on !== 'noReshuffle') phases.push(shuffle(b));
    return phases;
  }

  // No move left: mix the gems up (the ice stays where it is) until there's no line and there is a move.
  function shuffle(b) {
    const where = [];
    for (let i = 0; i < b.cells.length; i++) if (b.cells[i]) where.push(i);
    const gems = where.map((i) => b.cells[i]);
    for (let t = 0; t < 400; t++) {
      for (let x = gems.length - 1; x > 0; x--) {
        const y = randInt(b, x + 1);
        [gems[x], gems[y]] = [gems[y], gems[x]];
      }
      where.forEach((i, ix) => (b.cells[i] = gems[ix]));
      if (sab.on === 'shuffleMatches' || (!findRuns(b).length && hasMove(b))) return { type: 'shuffle', moves: where.map((i) => ({ id: b.cells[i].id, to: i })), recolor: [] };
    }
    // a board this full of one fruit can't be mixed into shape: new fruit for the plain gems
    const plain = where.filter((i) => !b.cells[i].sp);
    for (let t = 0; t < 200; t++) {
      fillNoMatch(b, plain, true);
      if (!findRuns(b).length && hasMove(b)) break;
    }
    return { type: 'shuffle', moves: where.map((i) => ({ id: b.cells[i].id, to: i })), recolor: plain.map((i) => ({ id: b.cells[i].id, k: b.cells[i].k })) };
  }

  function summarize(phases) {
    const out = { ok: true, phases, points: 0, counts: new Array(FRUIT.length).fill(0), ice: 0, cleared: 0, cascades: 0, specials: 0, shuffled: false };
    for (const p of phases) {
      if (p.type === 'clear') {
        out.points += p.points;
        out.cleared += p.removed.length;
        out.ice += p.ice.length;
        out.specials += p.made.length;
        out.cascades = Math.max(out.cascades, p.combo);
        p.counts.forEach((n, k) => (out.counts[k] += n));
      }
      if (p.type === 'shuffle') out.shuffled = true;
    }
    return out;
  }

  const iceLeft = (b) => b.ice.reduce((s, n) => s + n, 0);

  // ---------------------------------------------------------------- the 40 levels

  // Each: goals, moves (🔥 NORMAL's limit; 🐣 EASY has no limit and counts them for the stars), ice.
  // Goals: 's1000' score 1000 points, 'c0:15' collect 15 🍓 (fruit 0), 'i' break all the ice.
  // Ice shapes (js iceShape): a 2 on the end means two layers (on NORMAL; EASY's ice is always one layer).
  const LEVELS = [
    ['s600', 15], ['c0:12', 15], ['c1:12 c2:12', 16], ['s1200', 16], ['i', 18, 'center'],
    ['c3:16', 16], ['i', 26, 'middle'], ['s1800 c0:16', 20], ['i', 20, 'pillars'], ['i s1500', 20, 'diamond'],
    ['c4:16', 18], ['i', 34, 'top'], ['c5:14 c1:14', 21], ['s2500', 28], ['i', 20, 'ringin'],
    ['i', 30, 'center2'], ['c0:20 c2:20', 25], ['i', 30, 'stripes'], ['i s2000', 30, 'middle'], ['i', 28, 'diamond2'],
    ['c3:22 c4:22', 28], ['i', 30, 'xsmall2'], ['s3000', 32], ['i c5:18', 26, 'diamond'], ['c0:15 c1:15 c2:15', 24],
    ['i c2:18', 25, 'ringin'], ['s3000', 32], ['i', 38, 'cross'], ['c3:25 c5:25', 29], ['i s3000', 35, 'ringin2'],
    ['i', 34, 'ringin2'], ['c0:28', 32], ['i c1:20', 29, 'center2'], ['s4000', 40], ['i', 28, 'diamond2'],
    ['c2:22 c3:22 c4:22', 27], ['i s3500', 36, 'pillars'], ['i s3000', 32, 'center2'], ['c0:22 c5:22 s4000', 40], ['i c0:20', 30, 'checker2'],
  ];



  function iceShape(name, rows, cols) {
    const two = /2$/.test(name), base = name.replace(/2$/, '');
    const out = new Array(rows * cols).fill(0);
    const mr = (rows - 1) / 2, mc = (cols - 1) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let on = false;
        const dr = Math.abs(r - mr), dc = Math.abs(c - mc);
        if (base === 'center') on = dr <= 1.5 && dc <= 1.5;
        else if (base === 'middle') on = dr < 1;
        else if (base === 'pillars') on = c === 2 || c === cols - 3;
        else if (base === 'diamond') on = dr + dc <= 2.5;
        else if (base === 'ringin') on = Math.max(dr, dc) > 0.5 && Math.max(dr, dc) < 2;
        else if (base === 'xsmall') on = dr <= 1.5 && dc <= 1.5 && (r - c === 0 || r + c === cols - 1);
        else if (base === 'bottom') on = r >= rows - 2;
        else if (base === 'top') on = r < 2;
        else if (base === 'corners') on = (r < 2 || r >= rows - 2) && (c < 2 || c >= cols - 2);
        else if (base === 'cross') on = dr < 1 || dc < 1;
        else if (base === 'stripes') on = c % 3 === 1 && dr < 2.5;
        else if (base === 'checker') on = (r + c) % 2 === 0 && dr < 2.5 && dc < 2.5;
        if (on) out[r * cols + c] = two ? 2 : 1;
      }
    }
    return { cells: out, two };
  }

  // Level n (1..40) for 'easy' or 'normal': the board, the goals and the moves.
  function level(n, diff = 'easy') {
    const easy = diff === 'easy';
    const ix = Math.max(0, Math.min(LEVELS.length - 1, n - 1));
    const [g, moves, ice] = LEVELS[ix];
    const size = easy ? 7 : 8;
    const kinds = easy ? (n <= 10 ? 4 : 5) : n <= 10 ? 5 : 6;
    const goals = [];
    const scale = (v) => (easy ? Math.max(5, Math.round((v * 0.6) / 5) * 5) : v);
    for (const t of g.split(' ')) {
      if (t[0] === 's') goals.push({ type: 'score', n: easy ? Math.round((+t.slice(1) * 0.55) / 100) * 100 : +t.slice(1) });
      else if (t[0] === 'c') {
        const [k, num] = t.slice(1).split(':').map(Number);
        let kk = k % kinds;
        while (goals.some((x) => x.type === 'collect' && x.k === kk)) kk = (kk + 1) % kinds;
        goals.push({ type: 'collect', k: kk, n: scale(num) });
      } else if (t === 'i') goals.push({ type: 'ice' });
    }
    let iceCells = null;
    if (ice) {
      const s = iceShape(ice, size, size);
      iceCells = easy ? s.cells.map((x) => Math.min(1, x)) : s.cells;
    }
    return { n: ix + 1, diff, rows: size, cols: size, kinds, moves, limit: easy ? 0 : moves, goals, ice: iceCells, iceName: ice || '' };
  }

  // How far the goals are: [{ type, k, n, have, done }], and whether they're all done.
  function goalState(lv, got, b) {
    const list = lv.goals.map((g) => {
      if (g.type === 'score') return { type: 'score', n: g.n, have: got.points, done: got.points >= g.n };
      if (g.type === 'collect') return { type: 'collect', k: g.k, n: g.n, have: Math.min(g.n, got.counts[g.k] || 0), done: (got.counts[g.k] || 0) >= g.n };
      const left = iceLeft(b);
      return { type: 'ice', n: lv.ice ? lv.ice.reduce((s, x) => s + x, 0) : 0, have: left, done: left === 0 };
    });
    return { list, done: list.every((x) => x.done) };
  }
  // stars for a won level: moves used against the level's moves
  const stars = (used, par) => (used <= Math.ceil(par * 0.7) ? 3 : used <= par ? 2 : 1);

  GS.rules = {
    FRUIT, NAMES, LEVELS, sab, blank, deal, newGem, clone, kindAt, findRuns, findGroups, specialFor, blastCells, clearPhase, fall,
    adjacent, swapCells, lineAt, wouldWork, allMoves, hasMove, rateMove, bestMove, move, settle, shuffle, fillNoMatch, iceLeft,
    iceShape, level, goalState, stars, nextRand, randInt,
  };
})(typeof window !== 'undefined' ? window : globalThis);
