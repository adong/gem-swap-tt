#!/usr/bin/env node
/* How hard each level is: a bot plays every level (the hint's "best move at a glance", the way your brother picks
   one, with a random move one time in three, like a kid) and we count wins inside the moves on 🔥 NORMAL, and the
   moves it takes on 🐣 EASY (no limit there).
     node tools/levels.js [tries per level, default 12] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Map, Set, Error, String, Infinity, Date };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/rules.js'), 'utf8'), ctx, { filename: 'rules.js' });
const R = ctx.GS.rules;
const tries = +(process.argv[2] || 12);

function play(lv, seed, cap) {
  const b = R.deal(lv, seed);
  const got = { points: 0, counts: [0, 0, 0, 0, 0, 0] };
  for (let used = 1; used <= cap; used++) {
    const want = { kinds: {}, ice: lv.goals.some((g) => g.type === 'ice') };
    for (const g of lv.goals) if (g.type === 'collect' && (got.counts[g.k] || 0) < g.n) want.kinds[g.k] = 1;
    const moves = R.allMoves(b);
    const m = R.randInt(b, 3) === 0 ? moves[R.randInt(b, moves.length)] : R.bestMove(b, want);
    const res = R.move(b, m[0], m[1]);
    got.points += res.points;
    res.counts.forEach((n, k) => (got.counts[k] += n));
    if (R.goalState(lv, got, b).done) return used;
  }
  return 0;
}

let seed = 777;
const rows = [];
for (let n = 1; n <= 40; n++) {
  const lvN = R.level(n, 'normal'), lvE = R.level(n, 'easy');
  let usedE = 0;
  const need = [];
  for (let t = 0; t < tries; t++) {
    need.push(play(lvN, (seed = (seed * 48271) % 2147483647), 300) || 300);
    usedE += play(lvE, (seed = (seed * 48271) % 2147483647), 300) || 300;
  }
  need.sort((a, b) => a - b);
  const wins = need.filter((u) => u <= lvN.moves).length;
  const pct = (q) => need[Math.min(need.length - 1, Math.floor(q * need.length))];
  rows.push({ n, goals: R.LEVELS[n - 1][0] + (R.LEVELS[n - 1][2] ? ' ' + R.LEVELS[n - 1][2] : ''), moves: lvN.moves, normalWins: `${Math.round((wins / tries) * 100)}%`, p50: pct(0.5), p75: pct(0.75), easyUsed: +(usedE / tries).toFixed(1) });
}
console.table(rows);
console.log('suggested moves (p75 + 2): ' + rows.map((r) => Math.max(15, r.p75 + 2)).join(', '));
