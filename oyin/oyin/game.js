// ===== Yo'l 3D: ochiq shahar, GAI va radarlar, garaj, multiplayer =====
const $ = id => document.getElementById(id), rnd = (a, b) => a + Math.random() * (b - a);
const S = 200, N = 5, RW = 22, E = N * S + RW / 2;           // yo'llar oralig'i, panjara, yo'l kengligi
const TYPES = {
  sedan: {n: 'Sedan', w: 1.9, l: 4.4, h: 1.0, max: 42, acc: 14},
  sport: {n: 'Sport', w: 1.9, l: 4.3, h: 0.8, max: 62, acc: 24},
  suv:   {n: 'SUV',   w: 2.1, l: 4.7, h: 1.4, max: 36, acc: 12},
  truck: {n: 'Yuk',   w: 2.3, l: 6.2, h: 1.8, max: 30, acc: 9},
  coupe: {n: 'Kupe', w: 1.9, l: 4.3, h: .85, max: 55, acc: 20},
  pickup: {n: 'Pikap', w: 2.1, l: 5.3, h: 1.5, max: 38, acc: 13},
  van: {n: 'Van', w: 2.1, l: 5.0, h: 1.9, max: 34, acc: 11}
};
const COLORS = ['#d62828', '#1d6fd1', '#f2b632', '#f4f4f4'];
const SPRAYS = {none: 'Sepishsiz', stripe: 'Chiziq', dots: 'Nuqta', low: 'Pastki'};
const car = {type: 'sedan', color: COLORS[0], spray: 'none', plate: '01 A 777 AA', country: 'UZ'};
const G = {mode: 'garage', nitro: 100, crashCool: 0, sirenT: 0, beepT: 0, x: 0, z: 0, a: 0, v: 0, money: 10000000, fines: 0, frozen: false, cool: 0, radarCool: 0, cam: 0, detector: true, flash: 0};

// ---- Three.js ----
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.domElement.id = 'gl'; document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#9ec9e8'); scene.fog = new THREE.Fog('#9ec9e8', 160, 750);
const cam = new THREE.PerspectiveCamera(60, 1, .1, 1500);
scene.add(new THREE.HemisphereLight('#ffffff', '#566655', .95));
const sun = new THREE.DirectionalLight('#fff3d6', .8); sun.position.set(200, 400, 100); scene.add(sun, sun.target); renderer.shadowMap.enabled = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, {left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400}); sun.shadow.camera.updateProjectionMatrix();
function resize() { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const QUAL = [{n: 'Past', pr: .75, fog: 400}, {n: "O'rta", pr: 1, fog: 600}, {n: 'Yuqori', pr: 2, fog: 800}, {n: 'Ultra', pr: 3, fog: 1100}];
const SET = {q: 2, fps: 90, map: 0};
try { Object.assign(SET, JSON.parse(localStorage.getItem('yol3d') || '{}')); } catch (e) {}
function applyQuality() {
  const q = QUAL[SET.q]; renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr)); scene.fog.far = q.fog; sun.castShadow = SET.q >= 2; cam.far = q.fog + 400; cam.updateProjectionMatrix(); resize();
  try { localStorage.setItem('yol3d', JSON.stringify(SET)); } catch (e) {}
}
applyQuality();
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({color: c, roughness: .55, metalness: .1}, o));

// ---- Mashina modeli ----
const PLATES = {UZ: {s: '01 A 777 AA', band: '#1d4ed8', bg: '#fff'}, RU: {s: 'A 777 AA 77', band: '', bg: '#fff'}, KZ: {s: '777 ABC 01', band: '#1d4ed8', bg: '#fff'},
  TR: {s: '34 ABC 123', band: '#1d4ed8', bg: '#fff'}, DE: {s: 'B AB 1234', band: '#1d4ed8', bg: '#fff'}, US: {s: 'ABC-1234', band: '', bg: '#f2c744'}};
function plateTex(txt, cc) {
  const P = PLATES[cc] || PLATES.UZ, c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = P.bg; x.fillRect(0, 0, 256, 64); x.strokeStyle = '#111'; x.lineWidth = 5; x.strokeRect(2, 2, 252, 60);
  x.textBaseline = 'middle'; x.textAlign = 'center';
  if (P.band) { x.fillStyle = P.band; x.fillRect(5, 5, 44, 54); x.fillStyle = '#fff'; x.font = 'bold 20px sans-serif'; x.fillText(cc, 27, 34); }
  x.fillStyle = '#111'; x.font = 'bold ' + (txt.length > 9 ? 27 : 32) + 'px monospace'; x.fillText(txt, P.band ? 152 : 128, 34);
  return new THREE.CanvasTexture(c);
}
function makeCar(s) {
  const t = TYPES[s.type], g = new THREE.Group(), bh = t.h * .5, ch = t.h * .45, by = .3 + bh / 2, top = .3 + bh;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const CAB = {sedan: [.3, .7, .1], sport: [.35, .68, .14], suv: [.18, .82, .06], truck: [.55, .95, .04], coupe: [.35, .68, .14], pickup: [.45, .75, .05], van: [.08, .92, .04]}[s.type], L = t.l;
  const paint = new THREE.MeshPhysicalMaterial({color: s.color, metalness: .3, roughness: .35, clearcoat: 1, clearcoatRoughness: .08});
  const sh = new THREE.Shape(); sh.moveTo(0, .34); sh.lineTo(0, top - bh * .1); sh.lineTo(L * .08, top); sh.lineTo(L * .9, top); sh.lineTo(L, top - bh * .45); sh.lineTo(L, .34); sh.closePath();
  const bg = new THREE.ExtrudeGeometry(sh, {depth: t.w - .2, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 3, curveSegments: 4});
  bg.translate(-L / 2, 0, -(t.w - .2) / 2); const body = new THREE.Mesh(bg, paint); body.rotation.y = -Math.PI / 2; g.add(body);
  const cs = CAB[0] * L, ce = CAB[1] * L, rk = CAB[2] * L, ct = top + ch, cb = new THREE.Shape();
  cb.moveTo(cs, top); cb.lineTo(cs + rk, ct); cb.lineTo(ce - rk * 1.6, ct); cb.lineTo(ce, top); cb.closePath();
  const cg = new THREE.ExtrudeGeometry(cb, {depth: t.w * .8, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2, curveSegments: 2});
  cg.translate(-L / 2, .06, -t.w * .4); const cab = new THREE.Mesh(cg, M('#2a3f55', {metalness: .2, roughness: .05})); cab.rotation.y = -Math.PI / 2; g.add(cab);
  add(new THREE.BoxGeometry(t.w * .78, .07, ce - rk * 1.6 - cs - rk), paint, 0, ct + .09, (cs + rk + ce - rk * 1.6) / 2 - L / 2);
  const dark = M('#14161a');
  if (s.spray === 'stripe') add(new THREE.BoxGeometry(t.w * .22, .02, t.l * 1.002), dark, 0, top + .09, 0);
  if (s.spray === 'low') add(new THREE.BoxGeometry(t.w + .2, bh * .4, t.l + .2), dark, 0, .3 + bh * .2, 0);
  if (s.spray === 'dots') for (const x of [-.25, .25]) for (const z of [.3, .42, -.42]) add(new THREE.CylinderGeometry(.22, .22, .02, 12), dark, x * t.w, top + .09, z * t.l);
  const wg = new THREE.CylinderGeometry(.38, .38, .3, 18), wm = M('#111'), rg2 = new THREE.CylinderGeometry(.24, .24, .32, 14), rmat = M('#d8dce0', {metalness: .3, roughness: .3});
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(wg, wm, sx * (t.w / 2 + .04), .38, sz * t.l * .33).rotation.z = Math.PI / 2; add(rg2, rmat, sx * (t.w / 2 + .05), .38, sz * t.l * .33).rotation.z = Math.PI / 2;
  }
  const hl = M('#fff2b0', {emissive: '#ffe08a', emissiveIntensity: .8}), tl = M('#ff2a2a', {emissive: '#ff0000', emissiveIntensity: .6});
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(.4, .2, .06), hl, sx * t.w * .33, by, t.l / 2 + .1); add(new THREE.BoxGeometry(.4, .2, .06), tl, sx * t.w * .33, by, -t.l / 2 - .1); }
  const pm = new THREE.MeshBasicMaterial({map: plateTex(s.plate, s.country)});
  add(new THREE.PlaneGeometry(.9, .225), pm, 0, .42, t.l / 2 + .1);
  add(new THREE.PlaneGeometry(.9, .225), pm, 0, .42, -t.l / 2 - .1).rotation.y = Math.PI;
  if (s.police) {
    add(new THREE.BoxGeometry(t.w + .04, .22, t.l * .55), M('#1d4ed8'), 0, by, 0);
    g.userData.lr = add(new THREE.BoxGeometry(.5, .14, .3), M('#f00', {emissive: '#f00'}), -.3, top + ch + .2, -t.l * .06);
    g.userData.lb = add(new THREE.BoxGeometry(.5, .14, .3), M('#00f', {emissive: '#00f'}), .3, top + ch + .2, -t.l * .06);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function label(txt) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 6;
  x.strokeText(txt, 128, 44); x.fillText(txt, 128, 44);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(c), depthTest: false}));
  sp.scale.set(6, 1.5, 1); sp.position.y = 3.2; return sp;
}

// ---- Xaritalar ----
const MAPS = [
  {n: 'Shahar', ground: '#5c8a4a', sky: '#9ec9e8', bd: [14, 75], dens: 2, ts: 36, leaf: '#2f7a3a'},
  {n: 'Qishloq', ground: '#6fa85a', sky: '#a8d4f0', bd: [5, 14], dens: 1, ts: 18, leaf: '#3d9a45'},
  {n: "Cho'l", ground: '#d2b277', sky: '#ecd2a0', bd: [4, 9], dens: 0, ts: 70, leaf: '#7a8f3a'},
  {n: 'Qish', ground: '#eef3f7', sky: '#c6d4e0', bd: [12, 50], dens: 2, ts: 30, leaf: '#e6eef5'}
];
const BUILD = [];
const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 16, 12), new THREE.MeshBasicMaterial({side: THREE.BackSide, fog: false, depthWrite: false}));
sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
function setSky(c) {
  const top = new THREE.Color(c).lerp(new THREE.Color('#3d6fb8'), .65), cv = document.createElement('canvas'); cv.width = 4; cv.height = 128;
  const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(.55, c); gr.addColorStop(1, c);
  x.fillStyle = gr; x.fillRect(0, 0, 4, 128); sky.material.map = new THREE.CanvasTexture(cv); sky.material.needsUpdate = true;
}
let worldGroup = null;
function buildWorld(mi) {
  const MP = MAPS[mi]; if (worldGroup) scene.remove(worldGroup); worldGroup = new THREE.Group(); scene.add(worldGroup); BUILD.length = 0;
  scene.background = new THREE.Color(MP.sky); scene.fog.color.set(MP.sky); setSky(MP.sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), M(MP.ground));
  ground.receiveShadow = true; ground.rotation.x = -Math.PI / 2; worldGroup.add(ground);
  const rc = document.createElement('canvas'); rc.width = 64; rc.height = 128; const rx = rc.getContext('2d');
  rx.fillStyle = '#2a2d32'; rx.fillRect(0, 0, 64, 128); rx.fillStyle = '#e8e4d8'; rx.fillRect(2, 0, 2, 128); rx.fillRect(60, 0, 2, 128);
  rx.fillStyle = '#f2b632'; rx.fillRect(30, 0, 4, 64);
  const L = 2 * E, rt = new THREE.CanvasTexture(rc); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, L / 32);
  const rm = new THREE.MeshStandardMaterial({map: rt, roughness: .9}), rg = new THREE.PlaneGeometry(RW, L);
  for (let i = -N; i <= N; i++) {
    const a = new THREE.Mesh(rg, rm); a.rotation.x = -Math.PI / 2; a.position.set(i * S, .02, 0); a.receiveShadow = true; worldGroup.add(a);
    const b = new THREE.Mesh(rg, rm); b.rotation.set(-Math.PI / 2, 0, Math.PI / 2); b.position.set(0, .03 + .001 * i, i * S); b.receiveShadow = true; worldGroup.add(b);
  }
  const wc = document.createElement('canvas'); wc.width = wc.height = 64; const wx = wc.getContext('2d');
  wx.fillStyle = '#fff'; wx.fillRect(0, 0, 64, 64); wx.fillStyle = '#6b7d92';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) wx.fillRect(i * 16 + 3, j * 16 + 4, 10, 9);
  const mats = ['#c9c2b8', '#a9b4c2', '#d8cdb5', '#8e9aa6', '#cfa98f', '#b7c4b0'].map(c => {
    const tx = new THREE.CanvasTexture(wc); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return M(c, {map: tx});
  });
  for (let i = -N; i < N; i++) for (let j = -N; j < N; j++) {
    const n = MP.dens + (Math.random() * 2 | 0);
    for (let k = 0; k < n; k++) {
      const w = rnd(24, 60), d = rnd(24, 60), h = rnd(MP.bd[0], MP.bd[1]), cx = (i + .5) * S + rnd(-40, 40), cz = (j + .5) * S + rnd(-40, 40);
      if (BUILD.some(b => Math.abs(b.x - cx) < b.hw + w / 2 + 3 && Math.abs(b.z - cz) < b.hd + d / 2 + 3)) continue;
      const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
      for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * (w + d) / 28, uv.getY(q) * h / 14);
      const m = new THREE.Mesh(g, mats[Math.random() * 6 | 0]); m.position.set(cx, h / 2, cz); m.castShadow = true; worldGroup.add(m);
      BUILD.push({x: cx, z: cz, hw: w / 2, hd: d / 2});
    }
  }
  const pos = []; for (let i = -N; i <= N; i++) for (let p = -E + 20; p < E; p += MP.ts) {
    if (Math.abs(((p + S / 2) % S + S) % S - S / 2) < RW) continue;
    for (const s of [-1, 1]) { pos.push([i * S + s * (RW / 2 + 3), p]); pos.push([p, i * S + s * (RW / 2 + 3)]); }
  }
  const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.3, .4, 3, 6), M('#6b4a2b'), pos.length);
  const cr = new THREE.InstancedMesh(new THREE.ConeGeometry(2, 5, 7), M(MP.leaf), pos.length), mx = new THREE.Matrix4();
  pos.forEach((p, i) => { mx.makeTranslation(p[0], 1.5, p[1]); tr.setMatrixAt(i, mx); mx.makeTranslation(p[0], 5.4, p[1]); cr.setMatrixAt(i, mx); });
  worldGroup.add(tr, cr);
}
buildWorld(SET.map);

// ---- Radarlar ----
const RADARS = [[0, 1], [1, 0], [0, -1], [-1, 0], [2, 2], [-2, 2], [2, -2], [-2, -2], [3, 0], [0, 3], [-3, 0], [0, -3]].map(([i, j]) => {
  const x = i * S + RW / 2 + 2, z = j * S + RW / 2 + 2, g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 6, 8), M('#777')); pole.position.y = 3; g.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .9), M('#f28a1a', {emissive: '#a04a00', emissiveIntensity: .5})); head.position.y = 6.2; g.add(head);
  g.position.set(x, 0, z); scene.add(g); return {x, z};
});

// ---- GAI mashinalari ----
const COPS = [];
function nextTarget(p) {
  const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [p.ti + d[0], p.tj + d[1]]).filter(q => Math.abs(q[0]) <= N && Math.abs(q[1]) <= N && !(q[0] === p.pi && q[1] === p.pj));
  const q = c[Math.random() * c.length | 0]; p.pi = p.ti; p.pj = p.tj; p.ti = q[0]; p.tj = q[1];
}
for (let k = 0; k < 4; k++) {
  const i = (Math.random() * 7 | 0) - 3, j = (Math.random() * 7 | 0) - 3, g = makeCar({type: 'sedan', color: '#f4f4f4', spray: 'none', plate: '01 GAI 0' + (k + 1), police: true});
  const p = {g, x: i * S, z: j * S, a: 0, v: 0, ti: i, tj: j, pi: 99, pj: 99, mode: 'patrol', t: 0, fine: 0};
  nextTarget(p); scene.add(g); COPS.push(p);
}
const turnTo = (a, ta, r) => { const d = ((ta - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + Math.max(-r, Math.min(r, d)); };

// ---- Garaj UI ----
let pc = null;
function setCar() { if (pc) scene.remove(pc); pc = makeCar(car); scene.add(pc); }
function makeButtons(box, items, key, lab) {
  items.forEach(v => {
    const b = document.createElement('button');
    if (lab) b.textContent = lab(v); else { b.className = 'sw'; b.style.background = v; b.setAttribute('aria-label', v); }
    b.onclick = () => { car[key] = v; [...box.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); setCar(); };
    if (car[key] === v) b.classList.add('on');
    box.appendChild(b);
  });
}
makeButtons($('types'), Object.keys(TYPES), 'type', k => TYPES[k].n);
makeButtons($('colors'), COLORS, 'color');
makeButtons($('sprays'), Object.keys(SPRAYS), 'spray', k => SPRAYS[k]);
$('plate').oninput = e => { car.plate = e.target.value.toUpperCase() || '-'; setCar(); };
setCar();

Object.keys(PLATES).forEach(cc => {
  const b = document.createElement('button'); b.textContent = cc; if (cc === car.country) b.classList.add('on');
  b.onclick = () => { car.country = cc; car.plate = PLATES[cc].s; $('plate').value = car.plate; [...$('country').children].forEach(x => x.classList.remove('on')); b.classList.add('on'); setCar(); };
  $('country').appendChild(b);
});
const ci = document.createElement('input'); ci.type = 'color'; ci.value = car.color;
ci.oninput = e => { car.color = e.target.value; [...$('colors').children].forEach(x => x.classList.remove('on')); setCar(); }; $('colors').appendChild(ci);
function optButtons(box, items, key, lab) {
  items.forEach(v => {
    const b = document.createElement('button'); b.textContent = lab(v);
    b.onclick = () => { SET[key] = v; [...box.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); applyQuality(); if (key === 'map') buildWorld(SET.map); };
    if (SET[key] === v) b.classList.add('on'); box.appendChild(b);
  });
}
optButtons($('maps'), [0, 1, 2, 3], 'map', i => MAPS[i].n);
optButtons($('quality'), [0, 1, 2, 3], 'q', i => QUAL[i].n);
optButtons($('fps'), [30, 60, 90, 0], 'fps', f => f ? f + ' FPS' : 'Cheksiz');

// ---- Boshqaruv ----
const keys = {}, kmap = {ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ' ': 'space', Shift: 'nitro'};
addEventListener('keydown', e => {
  const k = kmap[e.key.length > 1 ? e.key : e.key.toLowerCase()];
  if (k && e.target.tagName !== 'INPUT') { keys[k] = true; e.preventDefault(); }
  if (e.key.toLowerCase() === 'c') G.cam ^= 1;
  if (e.key.toLowerCase() === 'r' && e.target.tagName !== 'INPUT') G.detector = !G.detector;
});
addEventListener('keyup', e => { const k = kmap[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k) keys[k] = false; });
document.querySelectorAll('#touch button').forEach(b => {
  const k = b.dataset.k; b.addEventListener('pointerdown', () => keys[k] = true);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => keys[k] = false));
});
let toastT = 0;
function toast(m, ms = 3500) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
const som = n => Math.round(n).toLocaleString('ru-RU') + " so'm";
function addFine(n, why) { beep(880, .12, .15); setTimeout(() => beep(1320, .2, .15), 120); G.money -= n; G.fines++; toast(why + ' Jarima: ' + som(n)); }

// ---- Multiplayer ----
let ws = null, lastSend = 0; const others = {};
function connect() {
  try {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => { ws.send(JSON.stringify({t: 'j', track: '3d'})); $('net').textContent = "Multiplayer: ulandi"; };
    ws.onmessage = e => {
      const m = JSON.parse(e.data); if (m.t !== 'p') return; const seen = {};
      m.players.forEach(o => {
        seen[o.id] = 1; let p = others[o.id];
        if (!p) { p = others[o.id] = {g: makeCar(o.car), x: o.x, z: o.y, a: o.a}; p.g.add(label(o.name || '')); scene.add(p.g); }
        p.tx = o.x; p.tz = o.y; p.ta = o.a;
      });
      for (const id in others) if (!seen[id]) { scene.remove(others[id].g); delete others[id]; }
    };
    ws.onerror = () => { ws = null; };
  } catch (e) { ws = null; }
}
$('start').onclick = () => {
  initAudio(); Object.assign(G, {mode: 'drive', nitro: 100, x: 0, z: 0, a: 0, v: 0, frozen: false}); $('garage').hidden = true; $('hud').hidden = false; connect();
};
$('back').onclick = () => { G.mode = 'garage'; if (engG) engG.gain.value = 0; $('hud').hidden = true; $('garage').hidden = false; if (ws) ws.close(); ws = null; for (const id in others) { scene.remove(others[id].g); delete others[id]; } };
$('pay').onclick = () => {
  const p = COPS.find(c => c.mode === 'chase'); $('dialog').hidden = true; G.frozen = false; G.cool = 30;
  addFine(p.fine, "To'landi."); release(p);
};
function release(p) { p.mode = 'patrol'; p.ti = Math.max(-N, Math.min(N, Math.round(p.x / S))); p.tj = Math.max(-N, Math.min(N, Math.round(p.z / S))); p.pi = p.pj = 99; nextTarget(p); }

// ---- Ovozlar (WebAudio) ----
let AC = null, eng = null, engG = null, noiseBuf = null;
function initAudio() {
  if (AC) { AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)(); AC.resume();
    eng = AC.createOscillator(); eng.type = 'sawtooth'; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    engG = AC.createGain(); engG.gain.value = 0; eng.connect(lp); lp.connect(engG); engG.connect(AC.destination); eng.start();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * .6, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function noise(freq, dur, vol) {
  if (!AC) return; const sr = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  sr.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  sr.connect(f); f.connect(g); g.connect(AC.destination); sr.start(); sr.stop(t + dur);
}
function beep(freq, dur, vol = .1, type = 'sine') {
  if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(AC.destination); o.start(); o.stop(t + dur);
}
const backfireSnd = () => { noise(1800, .12, .5); beep(90, .1, .3, 'square'); setTimeout(() => { noise(1500, .1, .35); beep(80, .08, .2, 'square'); }, 90); };
const crashSnd = () => { noise(500, .4, .9); beep(55, .3, .4, 'square'); };
function audioTick(dt, nd, thr, nit) {
  if (!AC) return; const sp = Math.abs(G.v), t = AC.currentTime;
  eng.frequency.setTargetAtTime(38 + sp * 3.4 + (thr ? 14 : 0) + (nit ? 25 : 0), t, .08);
  engG.gain.setTargetAtTime(G.frozen ? .02 : .05 + (thr ? .05 : 0), t, .1);
  if (G.detector && nd < 250) { G.beepT -= dt; if (G.beepT <= 0) { beep(1400, .06, .08); G.beepT = Math.max(.12, nd / 250 * 1.2); } }
  if (COPS.some(c => c.mode === 'chase')) { G.sirenT -= dt; if (G.sirenT <= 0) { beep(G.siren ? 760 : 960, .35, .06, 'triangle'); G.siren = !G.siren; G.sirenT = .38; } }
}

// ---- Egzoz olovi (backfire) va nitro ----
const FL = [];
for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.16, 6, 6), new THREE.MeshBasicMaterial({color: '#ff9a1a', transparent: true, opacity: 0})); m.visible = false; scene.add(m); FL.push({m, life: 0, max: .3, v: new THREE.Vector3()}); }
function spawnFlame(n, blue) {
  const t = TYPES[car.type], sa = Math.sin(G.a), ca = Math.cos(G.a);
  for (const sx of [-1, 1]) for (let k = 0; k < n; k++) {
    const f = FL.find(q => q.life <= 0); if (!f) return; const lx = sx * t.w * .33;
    f.m.position.set(G.x - sa * (t.l / 2 + .1) + ca * lx, .35, G.z - ca * (t.l / 2 + .1) - sa * lx);
    f.v.set(-sa * rnd(6, 11) + rnd(-1, 1), rnd(.2, 1.2), -ca * rnd(6, 11) + rnd(-1, 1)); f.max = f.life = blue ? .25 : rnd(.2, .45);
    f.m.material.color.set(blue ? '#4da6ff' : (rnd(0, 1) > .5 ? '#ff9a1a' : '#ffd23a')); f.m.visible = true;
  }
}
function updateFlames(dt) { for (const f of FL) if (f.life > 0) { f.life -= dt; f.m.position.addScaledVector(f.v, dt); f.m.scale.setScalar(1 + (1 - f.life / f.max) * 1.5); f.m.material.opacity = Math.max(0, f.life / f.max); if (f.life <= 0) f.m.visible = false; } }
function sunFollow() { sun.position.set(G.x + 80, 140, G.z + 50); sun.target.position.set(G.x, 0, G.z); sun.target.updateMatrixWorld(); }

// ---- O'yin yangilanishi ----
function roadInfo(x, z) {
  const dx = Math.abs(((x + S / 2) % S + S) % S - S / 2), dz = Math.abs(((z + S / 2) % S + S) % S - S / 2);
  const onV = dx < RW / 2 && Math.abs(z) <= E, onH = dz < RW / 2 && Math.abs(x) <= E;
  const main = (onV && Math.round(x / S) === 0) || (onH && Math.round(z / S) === 0);
  return {on: onV || onH, limit: (onV || onH) ? (main ? 90 : 60) : 40};
}
function drive(dt) {
  const t = TYPES[car.type], ri = roadInfo(G.x, G.z), kmh = Math.abs(G.v) * 3.6;
  let nit = false;
  if (!G.frozen) {
    nit = !!keys.nitro && G.nitro > 5;
    if (keys.up) G.v += (t.acc + (nit ? 18 : 0)) * dt;
    if (keys.down) G.v -= (G.v > 0 ? 32 : t.acc * .5) * dt;
    G.v -= G.v * .22 * dt;
    if (!keys.up && !keys.down) G.v -= Math.sign(G.v) * Math.min(Math.abs(G.v), 3 * dt);
    if (keys.space) G.v -= Math.sign(G.v) * Math.min(Math.abs(G.v), 36 * dt);
    const mx = (ri.on ? t.max : t.max * .4) * (nit ? 1.3 : 1); if (G.v > mx) G.v = Math.max(mx, G.v - 25 * dt); G.v = Math.max(G.v, -8);
    const st = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    G.a += st * 1.9 * dt * Math.max(-1, Math.min(1, G.v / 6)) * (1 - Math.min(Math.abs(G.v) / t.max, 1) * .45);
  } else G.v = 0;
  G.nitro = Math.max(0, Math.min(100, G.nitro + (nit ? -35 : 6) * dt));
  if (nit && keys.up) spawnFlame(1, true);
  else if (!keys.up && kmh > 60 && !G.frozen && Math.random() < .05) { spawnFlame(2); backfireSnd(); }
  G.x += Math.sin(G.a) * G.v * dt; G.z += Math.cos(G.a) * G.v * dt;
  for (const b of BUILD) if (Math.abs(G.x - b.x) < b.hw + 1.4 && Math.abs(G.z - b.z) < b.hd + 1.4) {
    if (Math.abs(G.v) > 4 && G.crashCool <= 0) { crashSnd(); G.crashCool = .6; }
    G.x -= Math.sin(G.a) * G.v * dt * 1.5; G.z -= Math.cos(G.a) * G.v * dt * 1.5; G.v *= -.3;
  }
  G.x = Math.max(-E - 300, Math.min(E + 300, G.x)); G.z = Math.max(-E - 300, Math.min(E + 300, G.z));
  // radar: qo'zg'almas kameralar
  G.radarCool -= dt; G.crashCool -= dt; G.cool -= dt; G.flash -= dt;
  for (const r of RADARS) if (G.radarCool <= 0 && Math.hypot(r.x - G.x, r.z - G.z) < 24 && kmh > ri.limit + 5) {
    const over = kmh - ri.limit; G.radarCool = 8; G.flash = .15; addFine(100000 + Math.round(over) * 5000, 'RADAR! ' + Math.round(kmh) + ' km/soat.'); break;
  }
  // GAI
  if (!COPS.some(c => c.mode === 'chase') && G.cool <= 0 && kmh > ri.limit + 15) {
    const c = COPS.find(c => Math.hypot(c.x - G.x, c.z - G.z) < 80);
    if (c) { c.mode = 'chase'; c.t = 0; c.fine = 200000 + Math.round(kmh - ri.limit) * 10000; toast("GAI sizni to'xtatmoqda! Mashinani to'xtating!", 4500); }
  }
  $('speed').textContent = Math.round(kmh); $('limit').textContent = ri.limit;
  $('money').textContent = 'Hamyon: ' + som(G.money); $('fines').textContent = 'Jarimalar: ' + G.fines + ' ta';
  let nd = 1e9; for (const r of RADARS) nd = Math.min(nd, Math.hypot(r.x - G.x, r.z - G.z)); for (const c of COPS) nd = Math.min(nd, Math.hypot(c.x - G.x, c.z - G.z));
  $('radar').textContent = G.detector && nd < 250 ? 'Radar-detektor: ' + Math.round(nd) + ' m' : '';
  $('nitro').textContent = 'Nitro: ' + Math.round(G.nitro) + '%'; audioTick(dt, nd, keys.up, nit);
  $('flash').hidden = G.flash <= 0;
}
function updateCops(dt, time) {
  for (const p of COPS) {
    if (p.mode === 'patrol') {
      const dx = p.ti * S - p.x, dz = p.tj * S - p.z; p.a = turnTo(p.a, Math.atan2(dx, dz), 2.5 * dt); p.v = 13;
      if (Math.hypot(dx, dz) < 6) nextTarget(p);
    } else {
      const dx = G.x - p.x, dz = G.z - p.z, d = Math.hypot(dx, dz); p.t += dt;
      p.a = turnTo(p.a, Math.atan2(dx, dz), 3 * dt); p.v = Math.min(40, d * 1.5);
      if (d < 16 && Math.abs(G.v) * 3.6 < 12 && !G.frozen) {
        G.frozen = true; $('dtext').textContent = "Assalomu alaykum! Siz tezlik chegarasidan oshdingiz. Jarima yozildi: " + som(p.fine) + "."; $('dialog').hidden = false;
      }
      if (p.t > 25 && !G.frozen) { G.cool = 30; addFine(p.fine * 2, "Siz qochdingiz!"); release(p); }
    }
    p.x += Math.sin(p.a) * p.v * dt; p.z += Math.cos(p.a) * p.v * dt;
    p.g.position.set(p.x, 0, p.z); p.g.rotation.y = p.a;
    const on = p.mode === 'chase', f = Math.floor(time * 6) % 2;
    p.g.userData.lr.material.emissiveIntensity = on && f ? 1.5 : .1; p.g.userData.lb.material.emissiveIntensity = on && !f ? 1.5 : .1;
  }
}
const mc = $('mini').getContext('2d');
function drawMini() {
  mc.clearRect(0, 0, 150, 150); mc.save(); mc.beginPath(); mc.arc(75, 75, 75, 0, 7); mc.clip();
  const sc = .1, pt = (x, z) => { const dx = x - G.x, dz = z - G.z; return [75 - (dx * Math.cos(G.a) - dz * Math.sin(G.a)) * sc, 75 - (dx * Math.sin(G.a) + dz * Math.cos(G.a)) * sc]; };
  mc.strokeStyle = '#8b8f96'; mc.lineWidth = 3;
  for (let i = -N; i <= N; i++) {
    mc.beginPath(); mc.moveTo(...pt(i * S, -E)); mc.lineTo(...pt(i * S, E)); mc.stroke();
    mc.beginPath(); mc.moveTo(...pt(-E, i * S)); mc.lineTo(...pt(E, i * S)); mc.stroke();
  }
  const dot = (x, z, c, r) => { const [a, b] = pt(x, z); mc.fillStyle = c; mc.beginPath(); mc.arc(a, b, r, 0, 7); mc.fill(); };
  RADARS.forEach(r => dot(r.x, r.z, '#f28a1a', 3)); COPS.forEach(c => dot(c.x, c.z, c.mode === 'chase' ? '#ff2a2a' : '#4d8dff', 4));
  for (const id in others) dot(others[id].x, others[id].z, '#6bff8a', 3);
  dot(G.x, G.z, '#fff', 5); mc.restore();
}

// ---- Asosiy sikl ----
let last = performance.now();
function frame(now) {
  if (SET.fps && now - last < 1000 / SET.fps - 2) { requestAnimationFrame(frame); return; }
  const dt = Math.min(.05, (now - last) / 1000); last = now; const time = now / 1000;
  if (G.mode === 'drive') {
    drive(dt); updateCops(dt, time); drawMini();
    pc.position.set(G.x, 0, G.z); pc.rotation.y = G.a;
    const fx = Math.sin(G.a), fz = Math.cos(G.a);
    if (G.cam === 0) { cam.position.lerp(new THREE.Vector3(G.x - fx * 9, 4.2, G.z - fz * 9), 1 - Math.exp(-6 * dt)); cam.lookAt(G.x + fx * 4, 1.5, G.z + fz * 4); }
    else { cam.position.set(G.x + fx * .3, 1.3, G.z + fz * .3); cam.lookAt(G.x + fx * 20, 1.2, G.z + fz * 20); }
    if (ws && ws.readyState === 1 && now - lastSend > 50) {
      lastSend = now; ws.send(JSON.stringify({t: 's', x: G.x, y: G.z, a: G.a, v: G.v, car: {type: car.type, color: car.color, spray: car.spray, plate: car.plate, country: car.country}, name: $('nick').value}));
    }
  } else {
    pc.position.set(0, 0, 0); pc.rotation.y = 0; const a = time * .4;
    cam.position.set(Math.sin(a) * 8, 2.6, Math.cos(a) * 8); cam.lookAt(0, .9, 0); updateCops(dt, time);
  }
  for (const id in others) {
    const p = others[id]; if (p.tx === undefined) continue; const k = 1 - Math.exp(-12 * dt);
    p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; p.a = turnTo(p.a, p.ta, 6 * dt * 3); p.g.position.set(p.x, 0, p.z); p.g.rotation.y = p.a;
  }
  updateFlames(dt); sunFollow(); sky.position.copy(cam.position); renderer.render(scene, cam); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
