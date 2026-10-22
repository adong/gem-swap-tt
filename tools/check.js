#!/usr/bin/env node
/* Run the headless check from a terminal, with the same files the page loads (js/rules.js, js/check.js).
     node tools/check.js                    the check (no starting matches, a move or a reshuffle, cascades)
     node tools/check.js --sabotage gravityGap   plant one bug: the check must fail
       sabotages: startMatch noReshuffle shuffleMatches gravityGap noCascade iceStuck
     node tools/check.js --can-fail         every sabotage in turn: each must be caught */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Map, Set, Error, String, Infinity, Date };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/rules.js', 'js/check.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
if (args.includes('--can-fail')) {
  const out = ctx.GS.checkCanFail();
  console.log(JSON.stringify(out, null, 1));
  console.log(out.ok ? 'EVERY SABOTAGE WAS CAUGHT' : 'A SABOTAGE GOT THROUGH');
  process.exitCode = out.ok ? 0 : 1;
} else {
  const out = ctx.GS.check({ sabotage: opt('sabotage'), seed: +(opt('seed') || 0) || undefined });
  console.log(JSON.stringify(out, null, 1));
  console.log(out.ok ? 'CHECK PASSED' : 'CHECK FAILED');
  process.exitCode = out.ok ? 0 : 1;
}
