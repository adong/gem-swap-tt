/* TT Gem Swap: your brother, from TT Tile Link (by way of TT Memory Match). In 1 player (and against Froggy or Foxy)
   the other brother (Kit.roster.buddyFor: Teddy when Tommy plays, Tommy for Teddy) comes when called with T or his
   face button, any time and as often as you like. A visit:
     pop in beside you (at his roster buddyScale, in a puff of stars) → hello with his signature move (Teddy's boxing
     combo or his jump shot, Tommy's Y with ✌️) → toss you a treat (🍦 💧 🧃 🍪 🍉 🍌) → THE HELP: he points at a
     match: two gems glow and wiggle toward each other with ↔️ between them ("TOMMY SAYS: SWAP THESE 🍓!"). It's the
     best-looking move on the board, and it glows until you make a move (or he's called again).
     → he stays a few seconds to cheer your lines → his goodbye move → pop out.
   Calling him again while he's here brings another hello, another treat and another match.
   In 2 players both brothers are already there, so T is a high five (GS.highFive): they run together, slap hands
   and run back. It doesn't change the game. */
(function () {
  'use strict';
  const T = THREE;
  const GS = (window.GS = window.GS || {});
  const { pick, emojiTexture, rand } = Kit.gfx;

  const V = { pop: 0.35, treatAt: 2.1, peekAt: 2.7, stay: 4.5, maxWait: 25 };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];

  let api = null, entry = null, flyers = null;
  const actor = GS.makeActor();
  // phase: off | in | here | bye | out
  const b = { phase: 'off', t: 0, given: false, treatAt: V.treatAt, peeked: false, peekedAt: -1, calls: 0, treats: 0, peeks: 0, lastTreat: null, lastPeek: null, popT: 0, point: 0 };
  const treat = { sprite: null, flyT: -1, emoji: '', from: new T.Vector3(), to: new T.Vector3() };

  function init(a) {
    api = a;
    treat.sprite = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, depthTest: false, transparent: true }));
    treat.sprite.visible = false;
    treat.sprite.renderOrder = 22;
    GS.stage.scene.add(treat.sprite);
    flyers = a.flyers;
    actor.attach(GS.stage.scene, flyers);
    actor.root.rotation.x = a.tilt;
    actor.visible = false;
  }

  // The brother for this player (rebuilt only when he changes). Returns his roster entry.
  function setFor(playerId) {
    const id = Kit.roster.buddyFor(playerId);
    if (entry && entry.id === id) return entry;
    dismiss();
    entry = Kit.roster.get(id);
    actor.set(id, 1);
    const tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffb02e');
    tag.position.y = 2.75;
    actor.person.root.add(tag);
    actor.visible = false;
    return entry;
  }

  const scaleNow = () => (entry.buddyScale || 0.8) * api.scale();

  function call() {
    if (!entry) return 'none';
    b.calls++;
    if (b.phase === 'off' || b.phase === 'out') return summon();
    // another hello, another treat, another match
    actor.react('hello');
    b.phase = 'here';
    b.t = Math.min(b.t, V.pop + 0.1);
    Object.assign(b, { given: false, treatAt: b.t + 1.5, peeked: false, peekedAt: -1 });
    b.popT = Math.max(b.popT, V.pop);
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    GS.sfx.pop();
    return 'again';
  }

  function summon() {
    const s = api.spot();
    Object.assign(b, { phase: 'in', t: 0, given: false, treatAt: V.treatAt, peeked: false, peekedAt: -1, popT: 0 });
    actor.setScale(0.01);
    actor.place(s.x, s.y, s.z);
    actor.face = null;
    actor.faceDefault = Math.PI;
    actor.visible = true;
    actor.react('idle');
    const p = actor.root.position, k = scaleNow();
    for (let i = 0; i < 14; i++) flyers.add(i % 3 ? '⭐' : '✨', p.x, p.y + (1 + rand(0, 1)) * k, p.z, rand(-2.5, 2.5) * k, rand(1, 4) * k, rand(0.3, 0.5) * k, 0.8, rand(-4, 4), 3 * k);
    api.toast(`${entry.name}'S HERE!`, 'buddy');
    GS.sfx.pop();
    return 'summoned';
  }

  function dismiss() {
    b.phase = 'off';
    actor.visible = false;
    treat.flyT = -1;
    if (treat.sprite) treat.sprite.visible = false;
  }

  // You made a line while he's here: he cheers (and stays a little longer).
  function cheer() {
    if (b.phase !== 'here') return;
    actor.react('cheer');
    if (b.peeked) b.peekedAt = Math.max(b.peekedAt, b.t - 1.5);
  }

  // ---------------------------------------------------------------- the treat

  function giveTreat() {
    const [emoji, label] = pick(TREATS);
    treat.emoji = emoji;
    b.treats++;
    b.lastTreat = emoji;
    treat.sprite.material.map = emojiTexture(emoji);
    treat.sprite.material.needsUpdate = true;
    actor.root.updateMatrixWorld(true);
    Kit.people.handWorld(actor.person, 1, treat.from);
    treat.sprite.position.copy(treat.from);
    treat.sprite.scale.setScalar(0.7 * api.scale());
    treat.sprite.visible = true;
    treat.flyT = 0;
    api.toast(`${emoji} ${label} FROM ${entry.name}!`, 'treat');
    GS.sfx.kit('coin', 6);
  }

  function updateTreat(dt) {
    if (treat.flyT < 0) return;
    const player = api.player();
    treat.flyT += dt / 0.65;
    player.root.updateMatrixWorld(true);
    Kit.people.handWorld(player.person, -1, treat.to);
    const k = Math.min(1, treat.flyT);
    treat.sprite.position.lerpVectors(treat.from, treat.to, k);
    treat.sprite.position.y += Math.sin(k * Math.PI) * 1.6 * api.scale();
    treat.sprite.material.rotation = k * Math.PI * 2;
    if (k >= 1) {
      treat.flyT = -1;
      treat.sprite.visible = false;
      treat.sprite.material.rotation = 0;
      player.hold(treat.emoji, 8);
      player.react('cheer');
    }
  }

  // ---------------------------------------------------------------- the visit

  function update(dt) {
    updateTreat(dt);
    if (b.phase === 'off') return;
    b.t += dt;
    const full = scaleNow();
    // pop in and out: a springy scale
    if (b.phase === 'in' || b.phase === 'here' || b.phase === 'bye') {
      b.popT += dt;
      const u = Math.min(1, b.popT / V.pop);
      const spring = u < 1 ? 1 + Math.sin(u * Math.PI) * 0.25 : 1;
      actor.setScale(full * Math.max(0.01, u) * spring);
    }
    if (b.phase === 'in' && b.t >= V.pop) {
      b.phase = 'here';
      actor.react('hello');
    }
    if (b.phase === 'here') {
      // the treat: hand it over a moment after hello
      if (!b.given && b.t > b.treatAt - 0.35) actor.act('give', 0.6, 0, true);
      if (!b.given && b.t > b.treatAt) {
        b.given = true;
        giveTreat();
      }
      // the help: once the treat's on its way
      if (b.given && !b.peeked && b.t > Math.max(V.peekAt, b.treatAt + 0.6) && api.canPeek()) {
        const p = api.peek();
        if (p) {
          b.peeked = true;
          b.peekedAt = b.t;
          b.peeks++;
          b.lastPeek = p;
          b.point = p.dx >= 0 ? -2.2 : 2.2; // turn toward the match and point
          api.toast(`${entry.name} SAYS: SWAP THESE ${p.emoji}!`, 'save');
          GS.sfx.peek();
        }
      }
      if (b.peeked && b.t < b.peekedAt + 1.8) {
        actor.face = b.point;
        if (actor.mode !== 'signature') actor.act('point', 0.3, 0);
      } else actor.face = null;
      const done = b.peeked && b.t > b.peekedAt + V.stay && treat.flyT < 0;
      const gaveUp = !b.peeked && b.t > V.maxWait;
      if (done || gaveUp || (api.over() && b.given && b.t > V.peekAt)) {
        b.phase = 'bye';
        b.t = 0;
        actor.face = null;
        actor.react('goodbye');
      }
    } else if (b.phase === 'bye') {
      if (b.t > 1.7) {
        b.phase = 'out';
        b.t = 0;
        GS.sfx.pop();
      }
    } else if (b.phase === 'out') {
      const u = Math.min(1, b.t / 0.25);
      actor.setScale(full * Math.max(0.01, 1 - u) * (1 + Math.sin(u * Math.PI) * 0.2));
      if (u >= 1) {
        const p = actor.root.position;
        for (let i = 0; i < 8; i++) flyers.add('✨', p.x, p.y + full, p.z, rand(-2, 2) * full, rand(1, 3) * full, 0.35 * full, 0.6, rand(-4, 4), 3 * full);
        dismiss();
      }
    }
    actor.update(dt);
  }

  // Where he stands changed (the screen turned): stand there now.
  function relayout() {
    if (b.phase === 'off') return;
    const s = api.spot();
    actor.place(s.x, s.y, s.z);
  }

  // ---------------------------------------------------------------- 2 players: the high five

  const hf = { on: false, t: 0, clapped: false, back: false, raise: -1, count: 0, clapT: 0 };
  function highFive() {
    if (hf.on) return 'busy';
    const [a, c] = api.players();
    const [pa, pc] = api.meet();
    Object.assign(hf, { on: true, t: 0, clapped: false, back: false, raise: -1 });
    hf.count++;
    a.react('idle');
    c.react('idle');
    a.moveTo(pa.x, pa.z, 9 * api.scale());
    c.moveTo(pc.x, pc.z, 9 * api.scale());
    return 'high5';
  }
  function updateHighFive(dt) {
    if (!hf.on) return;
    hf.t += dt;
    const [a, c] = api.players();
    const pa = a.root.position, pc = c.root.position;
    const there = !a.moving && !c.moving;
    if (there && !hf.clapped && !hf.back) {
      // face each other, hands up, jump, clap
      a.face = pc.x > pa.x ? -Math.PI / 2 : Math.PI / 2;
      c.face = pa.x > pc.x ? -Math.PI / 2 : Math.PI / 2;
      if (hf.raise < 0) hf.raise = hf.t;
      a.act('high5', 0.8, 2.6, true);
      c.act('high5', 0.8, 2.6, true);
      if (hf.t > hf.raise + 0.28) {
        hf.clapped = true;
        hf.clapT = hf.t;
        GS.sfx.clap();
        const k = api.scale();
        const x = (pa.x + pc.x) / 2, y = pa.y + 2.7 * k, z = (pa.z + pc.z) / 2;
        flyers.add('💥', x, y, z, 0, 0.5 * k, 1.0 * k, 0.5, 0, 0);
        for (let i = 0; i < 8; i++) flyers.add(i % 2 ? '🙌' : '⭐', x, y, z, rand(-2.5, 2.5) * k, rand(1.5, 3.5) * k, rand(0.4, 0.6) * k, 1, rand(-3, 3), 4 * k);
        api.toast('HIGH FIVE! 🙌', 'buddy');
      }
    }
    if (hf.clapped && !hf.back && hf.t > hf.clapT + 0.9) {
      hf.back = true;
      const [ha, hc] = api.homes();
      a.face = null;
      c.face = null;
      a.moveTo(ha.x, ha.z, 9 * api.scale());
      c.moveTo(hc.x, hc.z, 9 * api.scale());
    } else if (hf.back && there) {
      hf.on = false;
      hf.raise = -1;
    }
  }
  function cancelHighFive() {
    if (!hf.on) return;
    hf.on = false;
    hf.raise = -1;
    const [a, c] = api.players();
    if (!a || !c) return;
    const [ha, hc] = api.homes();
    a.face = c.face = null;
    a.place(ha.x, ha.y, ha.z);
    c.place(hc.x, hc.y, hc.z);
  }

  GS.buddy = {
    init, setFor, call, summon, dismiss, cheer, update, relayout, V,
    get entry() { return entry; },
    get actor() { return actor; },
    get on() { return b.phase !== 'off'; },
    get phase() { return b.phase; },
    get waiting() { return b.phase === 'here' && b.given && !b.peeked; },
    info() {
      const r = actor.root.position;
      return {
        phase: b.phase, id: entry && entry.id, t: +b.t.toFixed(2), given: b.given, peeked: b.peeked, calls: b.calls,
        treats: b.treats, peeks: b.peeks, lastTreat: b.lastTreat, lastPeek: b.lastPeek, pose: actor.pose,
        x: +r.x.toFixed(2), y: +r.y.toFixed(2), scale: +actor.scale.toFixed(2), visible: actor.visible, flying: treat.flyT >= 0,
        highFives: hf.count, highFiving: hf.on,
      };
    },
  };
  GS.highFive = { start: highFive, update: updateHighFive, cancel: cancelHighFive, get on() { return hf.on; } };
})();
