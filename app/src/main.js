// Vice Cover Studio — editor wiring.
// Owns the cover state (photos, per-panel slots, layout, grade, words), the photo
// tray, panel selection by click/drag/wheel on the preview, undo/redo history, and
// PNG export at the exact post sizes. A ?shot= query hands control to ./shots.js,
// which drives the same state through the api object at the bottom of this file.
import { drawCover, panelAt, panelCount, EXPORT_SIZES, GRADES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const state = {
  photos: [],          // HTMLImageElement list, tray order
  photoNames: [],      // display name per photo
  slots: [],           // per panel: { photoIndex, x, y, zoom }
  layout: 'nine',
  grade: 'sunset',
  caption: 'NEON COAST',
  subtitle: 'vice nights, fast cars',
  badge: 'Launch Week',
  stars: 5,
  grain: true,
  frame: true,
  selected: 0,
  showSelection: true,
  sizeId: 'square',
};

const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify({ ...state, photos: undefined, photoNames: undefined, showSelection: undefined });
}
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
  redraw();
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); }

function ensureSlots() {
  const n = panelCount(state);
  while (state.slots.length < n) state.slots.push({ photoIndex: null, x: 0.5, y: 0.5, zoom: 1 });
  state.slots.length = Math.max(state.slots.length, n);
  if (state.selected >= n) state.selected = 0;
}

function redraw() {
  ensureSlots();
  drawCover(canvas, state);
  $('panel-label').textContent = `Panel ${state.selected + 1} of ${panelCount(state)}`;
  const slot = state.slots[state.selected];
  if (slot) {
    $('zoom').value = slot.zoom;
    $('posx').value = slot.x;
    $('posy').value = slot.y;
  }
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

let pickedPhoto = -1;
function renderTray() {
  const tray = $('tray');
  tray.replaceChildren();
  state.photos.forEach((img, i) => {
    const fig = document.createElement('figure');
    if (i === pickedPhoto) fig.className = 'picked';
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = state.photoNames[i] ?? `Photo ${i + 1}`;
    const cap = document.createElement('figcaption');
    cap.textContent = state.photoNames[i] ?? `Photo ${i + 1}`;
    fig.append(thumb, cap);
    fig.title = 'Pick this photo, or click to place it in the selected panel';
    fig.addEventListener('click', () => {
      pushHistory();
      pickedPhoto = i;
      state.slots[state.selected] = { ...state.slots[state.selected], photoIndex: i };
      renderTray();
      redraw();
    });
    tray.append(fig);
  });
}

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  pushHistory();
  for (const file of images) {
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push(img);
    state.photoNames.push(file.name.replace(/\.[^.]+$/, '').slice(0, 18));
  }
  if (pickedPhoto < 0) pickedPhoto = 0;
  spreadPhotos(false);
  renderTray();
  redraw();
  status.textContent = `${state.photos.length} photo(s) loaded — they never leave this machine.`;
}

function spreadPhotos(record = true) {
  if (!state.photos.length) return;
  if (record) pushHistory();
  const n = panelCount(state);
  for (let i = 0; i < n; i++) {
    state.slots[i] = { ...state.slots[i], photoIndex: i % state.photos.length };
  }
}

function fillAll() {
  if (pickedPhoto < 0 || !state.photos.length) { status.textContent = 'Load and pick a photo first.'; return; }
  pushHistory();
  const n = panelCount(state);
  for (let i = 0; i < n; i++) state.slots[i] = { ...state.slots[i], photoIndex: pickedPhoto };
  redraw();
}

function setSize(sizeId, forExport = false) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) ?? EXPORT_SIZES[0];
  state.sizeId = size.id;
  canvas.width = size.w;
  canvas.height = size.h;
  if (!forExport) redraw();
  return size;
}

function exportPNG(sizeId) {
  const keep = { w: canvas.width, h: canvas.height, show: state.showSelection };
  const size = setSize(sizeId, true);
  state.showSelection = false;
  drawCover(canvas, state);
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
    canvas.width = keep.w; canvas.height = keep.h;
    state.showSelection = keep.show;
    redraw();
  }, 'image/png');
}

function syncControls() {
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('caption').value = state.caption;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  $('stars').value = state.stars;
  $('grain').checked = state.grain;
  $('frame').checked = state.frame;
  $('size').value = state.sizeId;
}

function buildControls() {
  for (const [id, meta] of Object.entries(LAYOUTS)) {
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = meta.label;
    $('layout').append(opt);
  }
  for (const [id, meta] of Object.entries(GRADES)) {
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = meta.label;
    $('grade').append(opt);
  }
  for (const size of EXPORT_SIZES) {
    const opt = document.createElement('option');
    opt.value = size.id; opt.textContent = `${size.label} — ${size.w} x ${size.h}`;
    $('size').append(opt);
  }
  syncControls();
}

function bindControls() {
  $('photo').addEventListener('change', (e) => addFiles(e.target.files));
  const dz = $('dropzone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); addFiles(e.dataTransfer.files); });
  $('fill-all').addEventListener('click', fillAll);
  $('cycle').addEventListener('click', () => { spreadPhotos(true); redraw(); });
  $('layout').addEventListener('change', (e) => { pushHistory(); state.layout = e.target.value; state.selected = 0; redraw(); });
  $('grade').addEventListener('change', (e) => { pushHistory(); state.grade = e.target.value; redraw(); });
  $('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
  $('frame').addEventListener('change', (e) => { pushHistory(); state.frame = e.target.checked; redraw(); });
  $('stars').addEventListener('input', (e) => { state.stars = Number(e.target.value); redraw(); });
  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  const slotInput = (key) => (e) => {
    const slot = state.slots[state.selected];
    if (slot) slot[key] = Number(e.target.value);
    redraw();
  };
  $('zoom').addEventListener('input', slotInput('zoom'));
  $('posx').addEventListener('input', slotInput('x'));
  $('posy').addEventListener('input', slotInput('y'));
  $('clear-panel').addEventListener('click', () => {
    pushHistory();
    state.slots[state.selected] = { photoIndex: null, x: 0.5, y: 0.5, zoom: 1 };
    redraw();
  });
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('size').addEventListener('change', (e) => setSize(e.target.value));
  $('export').addEventListener('click', () => exportPNG(state.sizeId));
  $('export-all').addEventListener('click', () => EXPORT_SIZES.slice(0, 3).forEach((s, i) => setTimeout(() => exportPNG(s.id), i * 350)));

  // Click selects a panel; drag repositions its photo; wheel zooms it.
  let drag = null;
  const toNorm = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  canvas.addEventListener('pointerdown', (e) => {
    const [nx, ny] = toNorm(e);
    const hit = panelAt(state, nx, ny);
    if (hit < 0) return;
    if (hit !== state.selected) { state.selected = hit; }
    // Capture the pre-drag state so Undo restores where the photo started.
    drag = { lastX: e.clientX, lastY: e.clientY, moved: false, before: snapshot() };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const slot = state.slots[state.selected];
    if (!slot || slot.photoIndex == null) return;
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - drag.lastX) / r.width;
    const dy = (e.clientY - drag.lastY) / r.height;
    if (Math.abs(e.clientX - drag.lastX) + Math.abs(e.clientY - drag.lastY) > 1) drag.moved = true;
    slot.x = Math.min(1, Math.max(0, slot.x - dx * 0.9));
    slot.y = Math.min(1, Math.max(0, slot.y - dy * 0.9));
    drag.lastX = e.clientX; drag.lastY = e.clientY;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag?.moved && drag.before) { undoStack.push(drag.before); redoStack.length = 0; }
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    const slot = state.slots[state.selected];
    if (!slot || slot.photoIndex == null) return;
    e.preventDefault();
    slot.zoom = Math.min(3, Math.max(1, slot.zoom * (e.deltaY < 0 ? 1.06 : 0.94)));
    redraw();
  }, { passive: false });
}

// The api shots.js drives: load the named samples, apply the scene, size the canvas.
const shotApi = {
  async loadSamples(names, words, sizeId, fullFrame) {
    for (const name of names) {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(name);
    }
    Object.assign(state, words);
    state.showSelection = !fullFrame;
    if (fullFrame) document.body.classList.add('shot-cover');
    setSize(sizeId, true);
    spreadPhotos(false);
    // Give the hero panel the first photo with a gentle zoom for a poster feel.
    if (state.slots[0]) state.slots[0] = { ...state.slots[0], zoom: 1.12, y: 0.42 };
    syncControls();
    renderTray();
    redraw();
    if (fullFrame) {
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    }
  },
};

buildControls();
bindControls();
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotApi);
} else {
  // Start with the bundled samples already spread across the panels, so the first
  // thing a visitor sees is a finished cover they can tweak and export.
  (async () => {
    for (const name of ['boulevard', 'pier']) {
      state.photos.push(await loadImage(`samples/${name}.jpg`));
      state.photoNames.push(name);
    }
    pickedPhoto = 0;
    spreadPhotos(false);
    renderTray();
    setSize('square');
    status.textContent = 'Samples loaded — swap in your own photos to make it yours.';
  })();
}
