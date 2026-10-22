/* TT Gem Swap: the headless check of the rules (js/rules.js). It runs in the page (game.check()) and in node
   (node tools/check.js). The three things the brief asks for:
     1. no starting matches: every level's deal (40 levels x EASY and NORMAL x 4 deals) has no line of 3, by a
        separate scan written here, and has a move, by trying every swap here;
     2. a move always exists or the board reshuffles: hand-made dead boards come back mixed (the same gems, the ice
        where it was) with no line and a move; 60 bot games end every move on a full board, no line, a move;
     3. cascades are right: two hand-worked cascades land exactly where they should (a 2-step cascade; a 4-line
        that leaves a rocket where the moved gem landed); 400 random moves agree with a second, separate cascade
        (find lines, clear, drop, refill: written here) gem for gem; and every move's phases, replayed one by one the
        way the screen plays them, give the same board, with columns that keep their order and no gaps.
   checkCanFail() plants one bug at a time (GS.rules.sab) and each must make the check fail. */
(function (root) {
  'use strict';
  const GS = (root.GS = root.GS || {});

  function run(opts = {}) {
    const R = GS.rules;
    const out = { ok: true, failed: [], counts: {} };
    const fail = (name, why) => {
      out.ok = false;
      if (out.failed.length < 12) out.failed.push(`${name}: ${why}`);
    };
    const count = (k, n = 1) => (out.counts[k] = (out.counts[k] || 0) + n);
    R.sab.on = opts.sabotage || null;
    let seed = opts.seed || 12345;
    const nextSeed = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    try {
      // ---- our own scan for lines (not the rules' findRuns)
      const kind = (b, i) => (b.cells[i] && b.cells[i].sp !== 'r' ? b.cells[i].k : -1);
      const lineCells = (b) => {
        const s = new Set(), { rows, cols } = b;
        for (let r = 0; r < rows; r++) for (let c = 0; c + 2 < cols; c++) {
          const i = r * cols + c, k = kind(b, i);
          if (k >= 0 && kind(b, i + 1) === k && kind(b, i + 2) === k) [i, i + 1, i + 2].forEach((x) => s.add(x));
        }
        for (let c = 0; c < cols; c++) for (let r = 0; r + 2 < rows; r++) {
          const i = r * cols + c, k = kind(b, i);
          if (k >= 0 && kind(b, i + cols) === k && kind(b, i + 2 * cols) === k) [i, i + cols, i + 2 * cols].forEach((x) => s.add(x));
        }
        return s;
      };
      // ...and our own way to find a move: try every swap of neighbours on a copy
      const someMove = (b) => {
        const { rows, cols } = b;
        for (let i = 0; i < rows * cols; i++) {
          for (const j of [i % cols < cols - 1 ? i + 1 : -1, i + cols < rows * cols ? i + cols : -1]) {
            if (j < 0 || !b.cells[i] || !b.cells[j]) continue;
            const x = b.cells[i], y = b.cells[j];
            if (x.sp === 'r' || y.sp === 'r' || (x.sp && y.sp)) return [i, j];
            const t = { rows, cols, cells: b.cells.slice() };
            t.cells[i] = y;
            t.cells[j] = x;
            if (lineCells(t).size) return [i, j];
          }
        }
        return null;
      };
      const full = (b) => b.cells.every(Boolean);

      // ---- 1. no starting matches, and a move
      for (const diff of ['easy', 'normal']) {
        for (let n = 1; n <= 40; n++) {
          const lv = R.level(n, diff);
          for (let d = 0; d < 4; d++) {
            const b = R.deal(lv, nextSeed());
            count('deals');
            if (!full(b)) fail('deal', `level ${n} ${diff}: a gap`);
            const lines = lineCells(b);
            if (lines.size) fail('no starting matches', `level ${n} ${diff} deal ${d}: a line of 3 at cell ${[...lines][0]}`);
            if (!someMove(b)) fail('deal', `level ${n} ${diff} deal ${d}: no move`);
            if (lv.ice && b.ice.join() !== lv.ice.join()) fail('deal', `level ${n} ${diff}: the ice moved`);
          }
        }
      }

      // ---- 2. dead boards reshuffle
      const fromRows = (rows, kinds, feed) => {
        const b = R.blank(rows.length, rows[0].length, kinds, nextSeed());
        rows.forEach((row, r) => [...row].forEach((ch, c) => (b.cells[r * b.cols + c] = R.newGem(b, 'ABCDEF'.indexOf(ch)))));
        if (feed) b.feed = [...feed].map((ch) => 'ABCDEF'.indexOf(ch));
        return b;
      };
      const dead = [
        ['ABAB', 'CDCD', 'ABAB', 'CDCD'],
        ['ABCD', 'CDAB', 'ABCD', 'CDAB'],
        ['ABCAB', 'BCABC', 'CABCA', 'ABCAB', 'BCABC'],
        ['ABCDEF', 'CDEFAB', 'EFABCD', 'ABCDEF', 'CDEFAB', 'EFABCD'],
      ];
      for (const rows of dead) {
        const kinds = new Set(rows.join('')).size;
        const b = fromRows(rows, kinds);
        b.ice = b.cells.map((_, i) => (i % 3 === 0 ? 1 : 0));
        const iceBefore = b.ice.join();
        if (someMove(b)) { fail('dead board', `${rows[0]}… isn't dead (the check's own mistake)`); continue; }
        const ids = b.cells.map((g) => g.id).sort((x, y) => x - y).join();
        const kindsBefore = b.cells.map((g) => g.k).sort().join();
        const phases = R.settle(b, []);
        count('dead boards');
        if (!phases.some((p) => p.type === 'shuffle')) fail('reshuffle', `${rows[0]}…: no shuffle`);
        if (lineCells(b).size) fail('reshuffle', `${rows[0]}…: a line of 3 after the shuffle`);
        if (!someMove(b)) fail('reshuffle', `${rows[0]}…: still no move after the shuffle`);
        if (b.cells.map((g) => g.id).sort((x, y) => x - y).join() !== ids) fail('reshuffle', `${rows[0]}…: gems lost or added`);
        const recolored = phases.some((p) => p.type === 'shuffle' && p.recolor.length);
        if (!recolored && b.cells.map((g) => g.k).sort().join() !== kindsBefore) fail('reshuffle', `${rows[0]}…: fruit changed`);
        if (b.ice.join() !== iceBefore) fail('reshuffle', `${rows[0]}…: the ice moved`);
      }

      // ---- 3a. hand-worked cascades
      {
        // swap A(r1c0) with B(r2c0): the bottom row is AAA; it clears, the rest drop, DDD drops in on top and
        // clears too (连击 x2), then ACA drops in.
        const b = fromRows(['CDB', 'ABD', 'BAA'], 4, 'DDDACA');
        const res = R.move(b, 3, 6);
        const got = [0, 1, 2].map((r) => [0, 1, 2].map((c) => 'ABCD'[b.cells[r * 3 + c].k]).join(''));
        count('hand cascades');
        if (!res.ok) fail('cascade', 'the 2-step cascade: the swap was refused');
        else {
          if (got.join('/') !== 'ACA/CDB/BBD') fail('cascade', `the 2-step cascade ended ${got.join('/')}, not ACA/CDB/BBD`);
          if (res.cascades !== 2) fail('cascade', `the 2-step cascade counted ${res.cascades} steps`);
          if (res.cleared !== 6 || res.points !== 90) fail('cascade', `the 2-step cascade cleared ${res.cleared} for ${res.points} points (6 for 90)`);
          if (res.shuffled) fail('cascade', 'the 2-step cascade shuffled');
        }
      }
      {
        // swap A(r1c2) down into AA_A: a line of 4 makes a rocket (row) where the A landed
        const b = fromRows(['BCBDC', 'DCABD', 'AABAC'], 4, 'ABC');
        const res = R.move(b, 7, 12);
        const got = [0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => {
          const g = b.cells[r * 5 + c];
          return g.sp ? g.sp.toUpperCase() : 'ABCD'[g.k];
        }).join(''));
        count('hand cascades');
        if (!res.ok) fail('cascade', 'the rocket: the swap was refused');
        else {
          if (got.join('/') !== 'ABBCC/BCBDD/DCHBC') fail('cascade', `the rocket board ended ${got.join('/')}, not ABBCC/BCBDD/DCHBC`);
          if (b.cells[12].sp !== 'h' || b.cells[12].k !== 0) fail('cascade', 'the rocket is not an A row-rocket at r2c2');
          if (res.points !== 70 || res.cascades !== 1) fail('cascade', `the rocket move: ${res.points} points, ${res.cascades} steps (70, 1)`);
        }
        // a rocket that moves up out of the line doesn't go off
        const c = fromRows(['ABCAB', 'CCDCA', 'BDABD'], 4, 'ABCDABCDABCDABCD');
        c.cells[7].sp = 'h'; // the D in the middle row is a row-rocket
        const res2 = R.move(c, 2, 7); // the C above swaps down: CCCC in row 1, the rocket D goes up to row 0
        count('hand cascades');
        if (!res2.ok) fail('cascade', 'the rocket that moves away: the swap was refused');
        else if (res2.phases[1].blasts.length) fail('cascade', 'a rocket went off though it moved up out of the line');
      }
      {
        // a rocket in a line goes off and takes its whole row; ice under a cleared gem loses a layer
        const c = fromRows(['ABCAB', 'BCDCA', 'CDABD'], 4, 'ABCDABCDABCDABCDABCD');
        c.cells[6].sp = 'h'; // the C at r1c1 is a row-rocket
        c.ice[9] = 2; // r1c4, in the rocket's row
        const res = R.move(c, 2, 7); // row 1 becomes B C C C A → CCC with the rocket in it
        count('hand cascades');
        if (!res.ok) fail('cascade', 'the rocket in a line: refused');
        else {
          const first = res.phases[1];
          const rowGone = [5, 6, 7, 8, 9].every((i) => first.removed.some((x) => x.i === i));
          if (!rowGone) fail('cascade', 'the rocket in a line did not clear its row');
          if (c.ice[9] !== 1) fail('ice', `ice under a cleared gem: ${c.ice[9]} layers left (1)`);
        }
      }
      {
        // the blasts' shapes on an 8 x 8
        const b = R.blank(8, 8, 6, 1);
        const n = (i, sp) => R.blastCells(b, i, sp).length;
        count('blast shapes');
        if (n(0, 'h') !== 8 || n(0, 'v') !== 8 || n(0, 'b') !== 4 || n(27, 'b') !== 9 || n(27, 'B5') !== 25 || n(27, 'x') !== 15 || n(27, 'X3') !== 39 || n(27, 'all') !== 64) {
          fail('blasts', 'a blast is the wrong shape');
        }
      }

      // ---- 3b. a second cascade, written here: lines → clear → drop → refill (no specials), gem for gem
      const refMove = (b, a, c) => {
        const g = { rows: b.rows, cols: b.cols, cells: b.cells.map((x) => (x ? { k: x.k, sp: 0 } : null)), feed: b.feed.slice() };
        [g.cells[a], g.cells[c]] = [g.cells[c], g.cells[a]];
        let steps = 0, cleared = 0;
        for (;;) {
          const hit = lineCells(g);
          if (!hit.size) break;
          steps++;
          cleared += hit.size;
          for (const i of hit) g.cells[i] = null;
          for (let col = 0; col < g.cols; col++) {
            const stack = [];
            for (let r = g.rows - 1; r >= 0; r--) if (g.cells[r * g.cols + col]) stack.push(g.cells[r * g.cols + col]);
            for (let r = g.rows - 1, s = 0; r >= 0; r--, s++) g.cells[r * g.cols + col] = s < stack.length ? stack[s] : { k: g.feed.shift(), sp: 0 };
          }
        }
        return { steps, cleared, kinds: g.cells.map((x) => x.k) };
      };
      for (let t = 0; t < 400; t++) {
        const lv = R.level(1 + (t % 40), t % 2 ? 'normal' : 'easy');
        const b = R.deal(lv, nextSeed());
        b.noSpecials = true;
        b.feed = Array.from({ length: 600 }, () => R.randInt(b, b.kinds));
        const moves = R.allMoves(b);
        const m = moves[R.randInt(b, moves.length)];
        const ref = refMove(b, m[0], m[1]);
        const res = R.move(b, m[0], m[1]);
        count('moves vs the second cascade');
        if (res.shuffled) { count('(shuffled, compared up to the shuffle)'); continue; }
        if (res.cascades !== ref.steps) fail('cascade', `move ${t}: ${res.cascades} steps, the second cascade says ${ref.steps}`);
        else if (res.cleared !== ref.cleared) fail('cascade', `move ${t}: ${res.cleared} cleared, the second cascade says ${ref.cleared}`);
        else if (b.cells.map((x) => x.k).join() !== ref.kinds.join()) fail('cascade', `move ${t}: the board ended differently from the second cascade`);
      }

      // ---- 3c. bot games: replay every move's phases on a copy, the way the screen does
      const replay = (snap, phases, name) => {
        const cells = snap.slice(); // ids
        const where = new Map();
        cells.forEach((id, i) => id && where.set(id, i));
        for (const p of phases) {
          if (p.type === 'swap') {
            if (!p.ok) continue;
            [cells[p.a], cells[p.c]] = [cells[p.c], cells[p.a]];
            if (cells[p.a] !== p.idc || cells[p.c] !== p.ida) return fail(name, 'the swap moved the wrong gems');
          } else if (p.type === 'clear') {
            for (const x of p.removed) {
              if (cells[x.i] !== x.id) return fail(name, `a cleared gem wasn't where the phase said (cell ${x.i})`);
              cells[x.i] = 0;
            }
            for (const m of p.made) cells[m.i] = m.id;
          } else if (p.type === 'fall') {
            const before = cells.slice();
            const moved = new Map(p.moves.map((m) => [m.id, m]));
            const next = cells.slice();
            for (const m of p.moves) {
              if (before[m.from] !== m.id) return fail(name, 'a falling gem started in the wrong cell');
              if (m.to % snap.cols !== m.from % snap.cols || m.to <= m.from) return fail(name, 'a gem fell sideways or up');
              next[m.from] = 0;
            }
            for (const m of p.moves) next[m.to] = m.id;
            for (const s of p.spawns) {
              if (next[s.i]) return fail(name, 'a new gem landed on another');
              next[s.i] = s.id;
            }
            if (next.some((x) => !x)) return fail(name, 'a gap after the drop');
            // each column keeps its order, the old gems at the bottom, the new on top
            for (let c = 0; c < snap.cols; c++) {
              const was = [], now = [];
              for (let r = snap.rows - 1; r >= 0; r--) {
                if (before[r * snap.cols + c]) was.push(before[r * snap.cols + c]);
                now.push(next[r * snap.cols + c]);
              }
              if (now.slice(0, was.length).join() !== was.join()) return fail(name, `column ${c} lost its order in the drop`);
              void moved;
            }
            cells.splice(0, cells.length, ...next);
          } else if (p.type === 'shuffle') {
            const ids = cells.slice().sort().join();
            cells.fill(0);
            for (const m of p.moves) cells[m.to] = m.id;
            if (cells.slice().sort().join() !== ids) return fail(name, 'the shuffle lost a gem');
          }
        }
        return cells;
      };
      let shuffles = 0, specials = 0, combos = 0;
      for (let game = 0; game < 60; game++) {
        const lv = R.level(1 + ((game * 7) % 40), game % 2 ? 'normal' : 'easy');
        const b = R.deal(lv, nextSeed());
        for (let mv = 0; mv < 30; mv++) {
          const moves = R.allMoves(b);
          if (!moves.length) { fail('a move always exists', `game ${game} move ${mv}: no move and no shuffle`); break; }
          const m = mv % 3 ? moves[R.randInt(b, moves.length)] : R.bestMove(b);
          const snap = b.cells.map((g) => (g ? g.id : 0));
          snap.rows = b.rows;
          snap.cols = b.cols;
          const sp2 = b.cells[m[0]].sp && b.cells[m[1]].sp;
          const res = R.move(b, m[0], m[1]);
          count('bot moves');
          if (!res.ok) { fail('bot', `game ${game}: a move the rules offered was refused`); break; }
          if (sp2) combos++;
          specials += res.specials;
          if (res.shuffled) shuffles++;
          const cells = replay(snap, res.phases, 'replay');
          if (!cells) break;
          if (cells.join() !== b.cells.map((g) => g.id).join()) { fail('replay', `game ${game} move ${mv}: the phases don't add up to the board`); break; }
          // before any shuffle the last drop leaves no line (the cascade ran to the end)
          if (!full(b)) { fail('bot', `game ${game}: a gap`); break; }
          if (lineCells(b).size) { fail('cascades are right', `game ${game} move ${mv}: a line of 3 left after the cascade`); break; }
          if (!someMove(b)) { fail('a move always exists', `game ${game} move ${mv}: no move left and no shuffle`); break; }
        }
      }
      count('bot shuffles', shuffles);
      count('specials made', specials);
      count('special combos', combos);
    } catch (e) {
      fail('crash', e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : String(e));
    } finally {
      R.sab.on = null;
    }
    return out;
  }

  // Plant each bug in turn: the check must fail every time.
  function canFail(opts = {}) {
    const bugs = ['startMatch', 'noReshuffle', 'shuffleMatches', 'gravityGap', 'noCascade', 'iceStuck'];
    const out = { ok: true, caught: {}, clean: null };
    out.clean = run(opts).ok;
    if (!out.clean) out.ok = false;
    for (const s of bugs) {
      const r = run(Object.assign({}, opts, { sabotage: s }));
      out.caught[s] = r.ok ? 'MISSED' : r.failed[0];
      if (r.ok) out.ok = false;
    }
    return out;
  }

  GS.check = run;
  GS.checkCanFail = canFail;
})(typeof window !== 'undefined' ? window : globalThis);
