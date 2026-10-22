/* TT Gem Swap: the 3D board. One Three.js scene seen straight on: the board of fruit gems on a dark velvet tray,
   and the boys (js/actor.js) standing in front of it. The page behind is the room (CSS), so the canvas is see-through.
   - Layout works in screen pixels: view.fit(rect) sizes the board to fill a rectangle of the screen. The camera
     looks straight down -z, so toWorld(px, py, z) and toScreen() map the two exactly.
   - A gem: a glossy shape in its fruit's colour, a different shape for each fruit (so the colour isn't the only
     clue): 🍓 red heart, 🍊 orange circle, 🍋 yellow square, 🍏 green hexagon, 🫐 blue diamond, 🍇 purple star,
     with the fruit on its face. Specials: a rocket has stripes and arrows the way it fires, a bomb a glowing ring,
     a rainbow star is a white gem with a spinning rainbow.
   - view.play(phases) plays a move from js/rules.js: the swap (or the swap there and back), each clear (gems pop,
     rockets streak, bombs ring, new specials grow), each drop (gems fall and bounce, new ones fall in from above the
     tray, clipped at its top edge), a shuffle (every gem spins to its new cell). hooks.onPhase(p) runs as each
     starts, hooks.onDone() at the end. */
(function () {
  'use strict';
  const T = THREE;
  const GS = (window.GS = window.GS || {});
  const { makeCanvas, toTexture, emojiTexture, EMOJI_FONT, rand, radialTexture } = Kit.gfx;

  const FOV = 30, TAN = Math.tan((FOV * Math.PI) / 360), D = 60;
  const COLORS = ['#ff3b5c', '#ff9318', '#ffd21a', '#36c94a', '#2f86ff', '#a65cff'];
  const GR = 0.4; // a gem's radius, in cells
  const FACE_Z = 0.25;
  const S = { W: 1, H: 1 };
  let renderer = null, scene = null, camera = null, clip = null;
  const bodyGeo = {}, bodyMat = {}, faceMats = new Map();
  let faceGeo = null, shineMat = null, shineGeo = null, glowTex = null, beamTex = null, ringTex = null;

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.localClippingEnabled = true;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(FOV, 1, 1, 200);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight('#ffffff', '#c8b8e8', 0.85));
    const sun = new T.DirectionalLight('#fff6e8', 0.95);
    sun.position.set(-12, 18, 30);
    scene.add(sun);
    const rim = new T.DirectionalLight('#d8e8ff', 0.35);
    rim.position.set(14, -10, 12);
    scene.add(rim);
    clip = new T.Plane(new T.Vector3(0, -1, 0), 100);
    for (let k = 0; k < 6; k++) {
      bodyGeo[k] = extrude(shapeFor(k));
      bodyMat[k] = new T.MeshStandardMaterial({ color: COLORS[k], roughness: 0.2, metalness: 0.08, emissive: COLORS[k], emissiveIntensity: 0.16, clippingPlanes: [clip] });
    }
    bodyGeo.r = extrude(shapeFor(1));
    bodyMat.r = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0.1, emissive: '#fff4d0', emissiveIntensity: 0.25, clippingPlanes: [clip] });
    faceGeo = new T.PlaneGeometry(1, 1);
    shineGeo = new T.PlaneGeometry(1, 1);
    shineMat = new T.MeshBasicMaterial({ map: radialTexture(64, [[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]), transparent: true, depthWrite: false, clippingPlanes: [clip] });
    glowTex = radialTexture(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,250,200,0.75)'], [0.7, 'rgba(255,220,90,0.25)'], [1, 'rgba(255,220,90,0)']]);
    beamTex = makeBeam();
    ringTex = makeRing();
    resize();
  }

  // ---------------------------------------------------------------- the shapes

  function shapeFor(k) {
    const s = new T.Shape(), R = GR;
    if (k === 0) {
      // a heart
      const u = R / 0.42;
      s.moveTo(0, -0.42 * u);
      s.bezierCurveTo(-0.12 * u, -0.3 * u, -0.46 * u, -0.1 * u, -0.46 * u, 0.12 * u);
      s.bezierCurveTo(-0.46 * u, 0.33 * u, -0.3 * u, 0.43 * u, -0.18 * u, 0.43 * u);
      s.bezierCurveTo(-0.08 * u, 0.43 * u, 0, 0.36 * u, 0, 0.27 * u);
      s.bezierCurveTo(0, 0.36 * u, 0.08 * u, 0.43 * u, 0.18 * u, 0.43 * u);
      s.bezierCurveTo(0.3 * u, 0.43 * u, 0.46 * u, 0.33 * u, 0.46 * u, 0.12 * u);
      s.bezierCurveTo(0.46 * u, -0.1 * u, 0.12 * u, -0.3 * u, 0, -0.42 * u);
    } else if (k === 1) s.absarc(0, 0, R, 0, Math.PI * 2, false);
    else if (k === 2) {
      const h = R * 0.9, r = 0.12;
      s.moveTo(-h + r, -h);
      s.lineTo(h - r, -h);
      s.quadraticCurveTo(h, -h, h, -h + r);
      s.lineTo(h, h - r);
      s.quadraticCurveTo(h, h, h - r, h);
      s.lineTo(-h + r, h);
      s.quadraticCurveTo(-h, h, -h, h - r);
      s.lineTo(-h, -h + r);
      s.quadraticCurveTo(-h, -h, -h + r, -h);
    } else if (k === 3) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * R * 1.05, y = Math.sin(a) * R * 1.05;
        if (i) s.lineTo(x, y);
        else s.moveTo(x, y);
      }
    } else if (k === 4) {
      s.moveTo(0, R * 1.12);
      s.lineTo(R * 0.98, 0);
      s.lineTo(0, -R * 1.12);
      s.lineTo(-R * 0.98, 0);
    } else {
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? R * 0.68 : R * 1.12;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i) s.lineTo(x, y);
        else s.moveTo(x, y);
      }
    }
    return s;
  }
  function extrude(shape) {
    const g = new T.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 3, curveSegments: 18 });
    g.translate(0, 0, -0.04);
    return g;
  }

  // the face: the fruit, plus the special's marks (cached per fruit and special)
  function faceMat(k, sp) {
    const key = `${k}:${sp || ''}`;
    if (faceMats.has(key)) return faceMats.get(key);
    let map;
    if (!sp) map = emojiTexture(GS.rules.FRUIT[k]);
    else {
      const [c, g] = makeCanvas(256, 256);
      if (sp === 'r') {
        // a rainbow disc with a star
        const grad = g.createConicGradient ? g.createConicGradient(0, 128, 128) : null;
        if (grad) {
          ['#ff3b5c', '#ff9318', '#ffd21a', '#36c94a', '#2f86ff', '#a65cff', '#ff3b5c'].forEach((col, i) => grad.addColorStop(i / 6, col));
          g.fillStyle = grad;
        } else g.fillStyle = '#ff9318';
        g.beginPath();
        g.arc(128, 128, 112, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(128, 128, 58, 0, Math.PI * 2);
        g.fill();
        g.font = `86px ${EMOJI_FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('⭐', 128, 136);
      } else {
        g.font = `150px ${EMOJI_FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if (sp === 'h' || sp === 'v') {
          g.save();
          if (sp === 'v') {
            g.translate(128, 128);
            g.rotate(Math.PI / 2);
            g.translate(-128, -128);
          }
          // stripes across, then the fruit, then an arrow at each end
          g.fillStyle = 'rgba(255,255,255,0.85)';
          for (const y of [70, 120, 170]) g.fillRect(6, y, 244, 18);
          g.restore();
          g.fillText(GS.rules.FRUIT[k], 128, 142);
          g.save();
          g.translate(128, 128);
          if (sp === 'v') g.rotate(Math.PI / 2);
          g.lineJoin = 'round';
          g.lineWidth = 12;
          g.strokeStyle = '#14121f';
          g.fillStyle = '#ffffff';
          for (const d of [-1, 1]) {
            g.beginPath();
            g.moveTo(d * 126, 0);
            g.lineTo(d * 78, -40);
            g.lineTo(d * 78, 40);
            g.closePath();
            g.stroke();
            g.fill();
          }
          g.restore();
        } else if (sp === 'b') {
          g.fillText(GS.rules.FRUIT[k], 128, 142);
          g.lineWidth = 16;
          g.strokeStyle = '#fff3a0';
          g.shadowColor = '#ffffff';
          g.shadowBlur = 18;
          g.beginPath();
          g.arc(128, 128, 112, 0, Math.PI * 2);
          g.stroke();
          g.shadowBlur = 0;
          g.font = `76px ${EMOJI_FONT}`;
          g.fillText('💥', 200, 52);
        }
      }
      map = toTexture(c);
    }
    const m = new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, clippingPlanes: [clip] });
    faceMats.set(key, m);
    return m;
  }

  function makeBeam() {
    const [c, g] = makeCanvas(64, 64);
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.35, 'rgba(255,240,150,0.8)');
    grad.addColorStop(0.5, 'rgba(255,255,255,1)');
    grad.addColorStop(0.65, 'rgba(255,240,150,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return toTexture(c);
  }
  function makeRing() {
    const [c, g] = makeCanvas(256, 256);
    g.lineWidth = 22;
    g.strokeStyle = 'rgba(255,245,170,0.95)';
    g.shadowColor = '#ffffff';
    g.shadowBlur = 20;
    g.beginPath();
    g.arc(128, 128, 100, 0, Math.PI * 2);
    g.stroke();
    return toTexture(c);
  }
  // the tray's cells, a checkerboard of two dark velvets
  function gridTexture(rows, cols) {
    const u = 64;
    const [c, g] = makeCanvas(cols * u, rows * u);
    for (let r = 0; r < rows; r++) for (let x = 0; x < cols; x++) {
      g.fillStyle = (r + x) % 2 ? '#3b2f7a' : '#33286b';
      g.fillRect(x * u, r * u, u, u);
    }
    return toTexture(c);
  }
  const iceTex = {};
  function iceTexture(n) {
    if (iceTex[n]) return iceTex[n];
    const [c, g] = makeCanvas(128, 128);
    const grad = g.createLinearGradient(0, 0, 128, 128);
    if (n >= 2) {
      grad.addColorStop(0, '#e9fbff');
      grad.addColorStop(1, '#7fd3ff');
    } else {
      grad.addColorStop(0, '#f4fdff');
      grad.addColorStop(1, '#b8ecff');
    }
    g.fillStyle = grad;
    Kit.gfx.roundRect(g, 4, 4, 120, 120, 18);
    g.fill();
    g.lineWidth = n >= 2 ? 10 : 6;
    g.strokeStyle = n >= 2 ? '#3aa8e8' : '#ffffff';
    g.stroke();
    // cracks and frost
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(14, 30); g.lineTo(34, 22); g.lineTo(40, 40);
    g.moveTo(112, 92); g.lineTo(94, 102); g.lineTo(100, 116);
    g.stroke();
    if (n >= 2) {
      g.font = `30px ${EMOJI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const [x, y] of [[22, 22], [106, 22], [22, 106], [106, 106]]) g.fillText('❄️', x, y);
    }
    return (iceTex[n] = toTexture(c));
  }

  // ---------------------------------------------------------------- the screen

  function resize() {
    if (!renderer) return;
    S.W = Math.max(1, innerWidth);
    S.H = Math.max(1, innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(S.W, S.H, false);
    camera.aspect = S.W / S.H;
    camera.updateProjectionMatrix();
  }
  const kAt = (z = 0) => (2 * (D - z) * TAN) / S.H; // world units per pixel at depth z
  function toWorld(px, py, z = 0) {
    const k = kAt(z);
    return new T.Vector3((px - S.W / 2) * k, (S.H / 2 - py) * k, z);
  }
  const tmpV = new T.Vector3();
  function toScreen(v) {
    tmpV.copy(v).project(camera);
    return { x: (tmpV.x + 1) * 0.5 * S.W, y: (1 - tmpV.y) * 0.5 * S.H };
  }

  // ---------------------------------------------------------------- the board

  function makeView() {
    const group = new T.Group();
    scene.add(group);
    const tray = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, opacity: 0.94, depthWrite: false }));
    tray.position.z = -0.3;
    tray.renderOrder = -2;
    group.add(tray);
    const frame = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
    frame.position.z = -0.32;
    frame.renderOrder = -3;
    group.add(frame);
    const holder = new T.Group();
    group.add(holder);
    const iceGroup = new T.Group();
    group.add(iceGroup);
    const fxGroup = new T.Group();
    group.add(fxGroup);
    const mkSprite = (tex, order, depthTest = false) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest }));
      s.renderOrder = order;
      s.visible = false;
      fxGroup.add(s);
      return s;
    };
    // the glows sit behind the gems (the gems hide their middles)
    const selGlow = mkSprite(glowTex, 3, true);
    const hintGlows = [mkSprite(glowTex, 3, true), mkSprite(glowTex, 3, true)];
    const hintArrow = mkSprite(emojiTexture('↔️'), 30);
    const cursorMesh = (() => {
      const [c, g] = makeCanvas(128, 128);
      g.lineWidth = 10;
      g.strokeStyle = '#ffd400';
      Kit.gfx.roundRect(g, 8, 8, 112, 112, 22);
      g.stroke();
      g.lineWidth = 4;
      g.strokeStyle = '#14121f';
      Kit.gfx.roundRect(g, 3, 3, 122, 122, 26);
      g.stroke();
      return mkSprite(toTexture(c), 31);
    })();
    const beams = [];
    for (let i = 0; i < 24; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending }));
      m.visible = false;
      m.renderOrder = 28;
      fxGroup.add(m);
      beams.push({ m, t: 0, life: 0, w: 1, h: 1 });
    }
    const rings = [];
    for (let i = 0; i < 8; i++) rings.push({ s: mkSprite(ringTex, 29), t: 0, life: 0, size: 1 });

    const v = {
      rows: 0, cols: 0, px: 40, scale: 1, cx: 0, cy: 0,
      gems: new Map(), ice: new Map(), queue: [], cur: null, curT: 0, hooks: null,
      sel: -1, cursorCell: -1, hoverCell: -1, hintPair: null, flyers: null, time: 0,
    };

    // cell (r, c) in the board's own units
    const lx = (c) => c - (v.cols - 1) / 2;
    const ly = (r) => (v.rows - 1) / 2 - r;

    function setBoard(b, opts = {}) {
      clear();
      v.rows = b.rows;
      v.cols = b.cols;
      if (tray.material.map) tray.material.map.dispose();
      tray.material.map = gridTexture(b.rows, b.cols);
      tray.material.needsUpdate = true;
      tray.scale.set(b.cols, b.rows, 1);
      frame.scale.set(b.cols + 0.3, b.rows + 0.3, 1);
      for (let i = 0; i < b.cells.length; i++) {
        const g = b.cells[i];
        if (!g) continue;
        const r = Math.floor(i / b.cols), c = i % b.cols;
        const gv = makeGem(g, i);
        if (opts.drop !== false) {
          // drop in, row by row from the bottom
          gv.y = ly(r) + b.rows + 1;
          gv.mode = 'fall';
          gv.vy = 0;
          gv.delay = (b.rows - 1 - r) * 0.06 + c * 0.015;
        }
      }
      for (let i = 0; i < b.ice.length; i++) setIce(i, b.ice[i]);
      applyFit();
    }

    function makeGem(g, i) {
      const r = Math.floor(i / v.cols), c = i % v.cols;
      const obj = new T.Group();
      const body = new T.Mesh(bodyGeo[g.sp === 'r' ? 'r' : g.k], bodyMat[g.sp === 'r' ? 'r' : g.k]);
      const face = new T.Mesh(faceGeo, faceMat(g.k, g.sp));
      face.position.z = FACE_Z;
      face.renderOrder = 2;
      const shine = new T.Mesh(shineGeo, shineMat);
      shine.position.set(-0.13, 0.16, FACE_Z + 0.004);
      shine.scale.set(0.26, 0.13, 1);
      shine.rotation.z = 0.6;
      shine.renderOrder = 3;
      obj.add(body, face, shine);
      holder.add(obj);
      const gv = { id: g.id, k: g.k, sp: g.sp, cell: i, obj, body, face, x: lx(c), y: ly(r), tx: lx(c), ty: ly(r), fx: 0, fy: 0, vy: 0, mode: 'idle', t: 0, dur: 0.2, delay: 0, back: false, spin: 0, s: 1, squash: 0, ph: Math.random() * 6 };
      sizeFace(gv);
      v.gems.set(g.id, gv);
      place(gv);
      return gv;
    }
    function sizeFace(gv) {
      const big = gv.sp ? 0.9 : gv.k === 5 ? 0.46 : gv.k === 4 ? 0.5 : 0.58;
      gv.face.scale.set(big, big, 1);
    }
    function restyle(gv, k, sp) {
      gv.k = k;
      gv.sp = sp;
      gv.body.geometry = bodyGeo[sp === 'r' ? 'r' : k];
      gv.body.material = bodyMat[sp === 'r' ? 'r' : k];
      gv.face.material = faceMat(k, sp);
      sizeFace(gv);
    }
    function removeGem(gv) {
      holder.remove(gv.obj);
      v.gems.delete(gv.id);
    }
    function place(gv) {
      gv.obj.position.set(gv.x, gv.y, gv.mode === 'move' || gv.mode === 'shuffle' ? 0.3 : 0);
    }

    function setIce(i, n) {
      let m = v.ice.get(i);
      if (!n) {
        if (m) {
          iceGroup.remove(m);
          v.ice.delete(i);
        }
        return;
      }
      if (!m) {
        m = new T.Mesh(new T.PlaneGeometry(0.97, 0.97), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
        m.position.set(lx(i % v.cols), ly(Math.floor(i / v.cols)), -0.2);
        m.renderOrder = -1;
        iceGroup.add(m);
        v.ice.set(i, m);
      }
      m.material.map = iceTexture(n);
      m.material.needsUpdate = true;
    }

    // ---- where it is on the screen
    let rect = null;
    function fit(r) {
      rect = r;
      applyFit();
    }
    function applyFit() {
      if (!rect || !v.rows) return;
      v.px = Math.max(8, Math.min(rect.w / (v.cols + 0.5), rect.h / (v.rows + 0.5)));
      v.scale = v.px * kAt(0);
      const c = toWorld(rect.x + rect.w / 2, rect.y + rect.h / 2, 0);
      v.cx = c.x;
      v.cy = c.y;
      group.position.set(c.x, c.y, 0);
      group.scale.setScalar(v.scale);
      clip.constant = c.y + (v.rows / 2 + 0.02) * v.scale; // new gems show only once they're on the tray
    }
    function screenRect() {
      const half = { x: (v.cols / 2) * v.px, y: (v.rows / 2) * v.px };
      const c = toScreen(new T.Vector3(v.cx, v.cy, 0));
      return { x0: Math.round(c.x - half.x), y0: Math.round(c.y - half.y), x1: Math.round(c.x + half.x), y1: Math.round(c.y + half.y) };
    }
    function cellAt(px, py) {
      if (!v.rows) return -1;
      const w = toWorld(px, py, 0);
      const x = (w.x - v.cx) / v.scale + (v.cols - 1) / 2, y = (v.rows - 1) / 2 - (w.y - v.cy) / v.scale;
      const c = Math.round(x), r = Math.round(y);
      if (c < 0 || r < 0 || c >= v.cols || r >= v.rows) return -1;
      return r * v.cols + c;
    }
    function worldOf(i, out = new T.Vector3()) {
      return out.set(v.cx + lx(i % v.cols) * v.scale, v.cy + ly(Math.floor(i / v.cols)) * v.scale, 0.3 * v.scale);
    }
    function screenOf(i) {
      return toScreen(worldOf(i));
    }

    // ---- marks
    function select(i) {
      v.sel = i;
    }
    function cursor(i) {
      v.cursorCell = i;
    }
    function hover(i) {
      v.hoverCell = i;
    }
    function hint(pair) {
      v.hintPair = pair ? pair.slice() : null;
    }

    // ---- playing a move
    function play(phases, hooks = {}) {
      v.queue.push(...phases);
      v.hooks = hooks;
      if (!v.cur) nextPhase();
    }
    function nextPhase() {
      v.cur = v.queue.shift() || null;
      v.curT = 0;
      if (!v.cur) {
        const h = v.hooks;
        v.hooks = null;
        if (h && h.onDone) h.onDone();
        return;
      }
      startPhase(v.cur);
      if (v.hooks && v.hooks.onPhase) v.hooks.onPhase(v.cur);
    }
    const gemAt = (id) => v.gems.get(id);
    function moveTo(gv, i, dur, mode = 'move') {
      gv.fx = gv.x;
      gv.fy = gv.y;
      gv.tx = lx(i % v.cols);
      gv.ty = ly(Math.floor(i / v.cols));
      gv.cell = i;
      gv.mode = mode;
      gv.t = 0;
      gv.dur = dur;
    }
    function startPhase(p) {
      if (p.type === 'swap') {
        const a = gemAt(p.ida), c = gemAt(p.idc);
        if (a) moveTo(a, p.c, 0.17);
        if (c) moveTo(c, p.a, 0.17);
        if (!p.ok) {
          if (a) a.back = p.a;
          if (c) c.back = p.c;
        }
      } else if (p.type === 'clear') {
        for (const cv of p.convert) {
          const gv = gemAt(cv.id);
          if (gv) restyle(gv, gv.k, cv.sp);
        }
        // the blasts, and how long after each one a gem in its way pops
        const delayOf = new Map();
        for (const b of p.blasts) {
          blastFx(b);
          const r0 = Math.floor(b.i / v.cols), c0 = b.i % v.cols;
          for (const j of b.cells) {
            const d = Math.abs(Math.floor(j / v.cols) - r0) + Math.abs((j % v.cols) - c0);
            const t = 0.04 + d * 0.035;
            if (!delayOf.has(j) || delayOf.get(j) > t) delayOf.set(j, t);
          }
        }
        if (p.rainbow) for (const j of p.rainbow.targets) sparkLine(p.rainbow.i, j);
        for (const x of p.removed) {
          const gv = gemAt(x.id);
          if (!gv) continue;
          gv.mode = 'pop';
          gv.t = 0;
          gv.delay = delayOf.get(x.i) || 0;
        }
        for (const m of p.made) {
          const gv = makeGem(m, m.i);
          gv.mode = 'grow';
          gv.t = 0;
          gv.delay = 0.16;
          gv.s = 0.01;
          gv.obj.scale.setScalar(0.01);
        }
        for (const ic of p.ice) {
          setIce(ic.i, ic.left);
          if (v.flyers) {
            const w = worldOf(ic.i);
            for (let n = 0; n < 3; n++) v.flyers.add('❄️', w.x, w.y, w.z + 0.5, rand(-1.5, 1.5) * v.scale, rand(1, 3) * v.scale, 0.35 * v.scale, 0.7, rand(-4, 4), 6 * v.scale);
          }
        }
      } else if (p.type === 'fall') {
        for (const m of p.moves) {
          const gv = gemAt(m.id);
          if (!gv) continue;
          gv.cell = m.to;
          gv.ty = ly(Math.floor(m.to / v.cols));
          gv.mode = 'fall';
          gv.vy = 0;
          gv.delay = 0;
        }
        for (const s of p.spawns) {
          const r = Math.floor(s.i / v.cols);
          const gv = makeGem(s, s.i);
          gv.y = ly(r) + s.drop + 0.2;
          gv.ty = ly(r);
          gv.mode = 'fall';
          gv.vy = 0;
          gv.delay = 0;
          place(gv);
        }
      } else if (p.type === 'shuffle') {
        for (const rc of p.recolor) {
          const gv = gemAt(rc.id);
          if (gv) restyle(gv, rc.k, gv.sp);
        }
        for (const m of p.moves) {
          const gv = gemAt(m.id);
          if (gv) moveTo(gv, m.to, 0.55, 'shuffle');
        }
      }
    }

    function blastFx(b) {
      const r0 = Math.floor(b.i / v.cols), c0 = b.i % v.cols;
      const beam = (horizontal, at) => {
        const bm = beams.find((x) => !x.m.visible);
        if (!bm) return;
        bm.m.visible = true;
        bm.t = 0;
        bm.life = 0.42;
        if (horizontal) {
          bm.m.position.set(0, ly(at), 0.6);
          bm.w = v.cols + 0.4;
          bm.h = 0.9;
        } else {
          bm.m.position.set(lx(at), 0, 0.6);
          bm.w = 0.9;
          bm.h = v.rows + 0.4;
        }
        bm.vertical = !horizontal;
      };
      const ring = (size) => {
        const rg = rings.find((x) => !x.s.visible);
        if (!rg) return;
        rg.s.visible = true;
        rg.s.position.set(lx(c0), ly(r0), 0.7);
        rg.t = 0;
        rg.life = 0.45;
        rg.size = size;
      };
      if (b.sp === 'h') beam(true, r0);
      else if (b.sp === 'v') beam(false, c0);
      else if (b.sp === 'x') { beam(true, r0); beam(false, c0); }
      else if (b.sp === 'X3') for (let d = -1; d <= 1; d++) { beam(true, r0 + d); beam(false, c0 + d); }
      else if (b.sp === 'b') ring(3.4);
      else if (b.sp === 'B5') ring(5.6);
      else if (b.sp === 'all') ring(Math.max(v.rows, v.cols) * 1.3);
      else if (b.sp === 'r') for (const j of b.cells) sparkLine(b.i, j);
    }
    function sparkLine(from, to) {
      if (!v.flyers) return;
      const a = worldOf(from), z = worldOf(to);
      v.flyers.add('✨', z.x, z.y, z.z + 0.6, (a.x - z.x) * 0.3, (a.y - z.y) * 0.3 + 1 * v.scale, 0.45 * v.scale, 0.5, rand(-5, 5), 0);
    }

    function busy() {
      if (v.cur || v.queue.length) return true;
      for (const gv of v.gems.values()) if (gv.mode !== 'idle') return true;
      return false;
    }

    // ---- every frame
    const G_FALL = 46; // cells / s²
    function update(dt) {
      v.time += dt;
      v.curT += dt;
      let moving = 0;
      for (const gv of [...v.gems.values()]) {
        if (gv.delay > 0) {
          gv.delay -= dt;
          moving++;
          if (gv.mode === 'fall' || gv.mode === 'grow') continue;
          if (gv.mode === 'pop') { place(gv); continue; }
        }
        if (gv.mode === 'move' || gv.mode === 'shuffle') {
          moving++;
          gv.t += dt / gv.dur;
          const u = Math.min(1, gv.t), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          gv.x = gv.fx + (gv.tx - gv.fx) * e;
          gv.y = gv.fy + (gv.ty - gv.fy) * e;
          if (gv.mode === 'shuffle') {
            gv.obj.rotation.z = e * Math.PI * 2;
            gv.y += Math.sin(u * Math.PI) * 0.8;
          }
          if (u >= 1) {
            gv.obj.rotation.z = 0;
            if (gv.back !== false) {
              const to = gv.back;
              gv.back = false;
              moveTo(gv, to, 0.17);
            } else gv.mode = 'idle';
          }
        } else if (gv.mode === 'fall') {
          moving++;
          gv.vy += G_FALL * dt;
          gv.y -= gv.vy * dt;
          if (gv.y <= gv.ty) {
            gv.y = gv.ty;
            gv.squash = Math.min(0.22, gv.vy * 0.018);
            gv.vy = 0;
            gv.mode = 'idle';
            if (v.hooks && v.hooks.onLand) v.hooks.onLand(gv);
          }
        } else if (gv.mode === 'pop') {
          moving++;
          gv.t += dt / 0.22;
          const u = Math.min(1, gv.t);
          gv.s = u < 0.35 ? 1 + (u / 0.35) * 0.32 : 1.32 * (1 - (u - 0.35) / 0.65);
          if (u >= 1) {
            if (v.flyers) {
              const w = worldOf(gv.cell);
              const emo = gv.sp === 'r' ? '🌈' : GS.rules.FRUIT[gv.k];
              v.flyers.add(Math.random() < 0.5 ? emo : '✨', w.x, w.y, w.z + 0.4, rand(-1.6, 1.6) * v.scale, rand(1.5, 3.5) * v.scale, 0.42 * v.scale, 0.55, rand(-6, 6), 9 * v.scale);
            }
            removeGem(gv);
            continue;
          }
        } else if (gv.mode === 'grow') {
          moving++;
          gv.t += dt / 0.3;
          const u = Math.min(1, gv.t);
          gv.s = u < 0.6 ? (u / 0.6) * 1.25 : 1.25 - ((u - 0.6) / 0.4) * 0.25;
          if (u >= 1) {
            gv.s = 1;
            gv.mode = 'idle';
          }
        }
        // the look at rest: specials throb, the picked gem bobs, the hint wiggles
        let s = gv.mode === 'pop' || gv.mode === 'grow' ? gv.s : 1;
        let z = 0, wig = 0;
        if (gv.mode === 'idle') {
          if (gv.sp) s *= 1 + Math.sin(v.time * 6 + gv.ph) * 0.05;
          if (gv.cell === v.sel) {
            s *= 1.14;
            z = 0.4;
          } else if (gv.cell === v.hoverCell) s *= 1.06;
          if (v.hintPair && (gv.cell === v.hintPair[0] || gv.cell === v.hintPair[1])) {
            const other = gv.cell === v.hintPair[0] ? v.hintPair[1] : v.hintPair[0];
            wig = Math.max(0, Math.sin(v.time * 9)) * 0.1;
            const dx = lx(other % v.cols) - lx(gv.cell % v.cols), dy = ly(Math.floor(other / v.cols)) - ly(Math.floor(gv.cell / v.cols));
            gv.obj.position.set(gv.x + dx * wig, gv.y + dy * wig, 0.2);
          }
        }
        if (gv.squash > 0) gv.squash = Math.max(0, gv.squash - dt * 1.4);
        if (!wig) gv.obj.position.set(gv.x, gv.y, gv.mode === 'move' || gv.mode === 'shuffle' ? 0.35 : z);
        gv.obj.scale.set(s * (1 + gv.squash * 0.6), s * (1 - gv.squash), s);
        if (gv.sp === 'r') gv.face.rotation.z = v.time * 1.5;
      }
      // the current phase is over once everything has stopped
      if (v.cur && !moving && v.curT > (v.cur.type === 'clear' ? 0.12 : 0.02)) nextPhase();
      // marks
      const mark = (spr, i, size, pulse = 0, z = -0.12) => {
        spr.visible = i >= 0 && i < v.rows * v.cols;
        if (!spr.visible) return;
        spr.position.set(lx(i % v.cols), ly(Math.floor(i / v.cols)), z);
        const s = size * (1 + Math.sin(v.time * 6) * pulse);
        spr.scale.set(s, s, 1);
      };
      mark(selGlow, v.sel, 1.6, 0.06);
      mark(cursorMesh, v.cursorCell, 1.08, 0, 1);
      const hp = v.hintPair;
      mark(hintGlows[0], hp ? hp[0] : -1, 1.5, 0.12);
      mark(hintGlows[1], hp ? hp[1] : -1, 1.5, 0.12);
      hintArrow.visible = !!hp;
      if (hp) {
        const a = hp[0], c = hp[1];
        hintArrow.position.set((lx(a % v.cols) + lx(c % v.cols)) / 2, (ly(Math.floor(a / v.cols)) + ly(Math.floor(c / v.cols))) / 2, 1.2);
        const s = 0.62 * (1 + Math.sin(v.time * 8) * 0.12);
        hintArrow.scale.set(s, s, 1);
        hintArrow.material.rotation = a % v.cols === c % v.cols ? Math.PI / 2 : 0;
      }
      for (const bm of beams) {
        if (!bm.m.visible) continue;
        bm.t += dt;
        const u = bm.t / bm.life;
        if (u >= 1) { bm.m.visible = false; continue; }
        const grow = Math.min(1, u * 4), thin = 1 - u * 0.6;
        // a vertical beam is the same plane turned a quarter round: its length along x, its thickness along y
        bm.m.rotation.z = bm.vertical ? Math.PI / 2 : 0;
        if (bm.vertical) bm.m.scale.set(bm.h * grow, bm.w * thin, 1);
        else bm.m.scale.set(bm.w * grow, bm.h * thin, 1);
        bm.m.material.opacity = 1 - u;
      }
      for (const rg of rings) {
        if (!rg.s.visible) continue;
        rg.t += dt;
        const u = rg.t / rg.life;
        if (u >= 1) { rg.s.visible = false; continue; }
        const s = rg.size * (0.3 + u * 0.9);
        rg.s.scale.set(s, s, 1);
        rg.s.material.opacity = 1 - u;
      }
    }

    function clear() {
      for (const gv of [...v.gems.values()]) removeGem(gv);
      for (const i of [...v.ice.keys()]) setIce(i, 0);
      v.queue = [];
      v.cur = null;
      v.hooks = null;
      v.sel = -1;
      v.cursorCell = -1;
      v.hintPair = null;
      for (const bm of beams) bm.m.visible = false;
      for (const rg of rings) rg.s.visible = false;
    }
    // stop playing at once and show the board as it is (the rules' board)
    function snap(b) {
      clear();
      setBoard(b, { drop: false });
    }

    Object.assign(v, { setBoard, fit, screenRect, cellAt, worldOf, screenOf, select, cursor, hover, hint, play, busy, update, clear, snap, applyFit });
    Object.defineProperty(v, 'visible', { get: () => group.visible, set: (on) => (group.visible = on) });
    return v;
  }

  function render() {
    if (renderer) renderer.render(scene, camera);
  }

  GS.stage = {
    init, resize, render, makeView, toWorld, toScreen, kAt, COLORS,
    get W() { return S.W; },
    get H() { return S.H; },
    get scene() { return scene; },
    get camera() { return camera; },
  };
})();
