// Neon Bay Cover Art — wires the editor: photos in, panels, caption, sizes, export.
// Click a panel on the cover, then a photo to place it there; drag a panel to pan its
// photo and scroll over it to zoom. A `?shot=` query stages a fixed scene instead
// (./shots.js). Photos are read on the user's own machine and never uploaded.
import { drawCover, renderCover, loadImage, panelRects, panelAt, SIZES, LAYOUTS, CAPTION_COLORS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const thumbs = document.getElementById('thumbs');
const zoomInput = document.getElementById('zoom');
const params = new URLSearchParams(location.search);

/** The editor's whole state: size, layout, photos, per-panel crop, caption. */
export const state = {
  size: SIZES[2],
  layout: 'hero',
  photos: [],
  panels: [],
  selected: 0,
  caption: 'NEON BAY',
  tagline: 'SUNSET HEIST',
  captionScale: 1,
  captionY: 0.88,
  captionColor: 'white',
  accent: '#ff2e88',
};

/** Rebuilds the panel list for the current layout, keeping assignments where they fit. */
function freshPanels() {
  const count = LAYOUTS[state.layout].panels;
  const old = state.panels;
  state.panels = Array.from({ length: count }, (_, i) => old[i] ?? { photo: null, zoom: 1.15, px: 0, py: 0 });
  state.selected = Math.min(state.selected, count - 1);
  for (let i = 0; i < state.panels.length; i++) {
    if (state.panels[i].photo === null && state.photos.length > 0) {
      state.panels[i].photo = i % state.photos.length;
    }
  }
}

/** Paints the preview and, unless it is a cover-only shot, the selected panel's outline. */
function redraw() {
  drawCover(canvas, state);
  if (document.body.classList.contains('shot-cover')) return;
  const rects = panelRects(state.layout, state.size.w, state.size.h);
  const rect = rects[state.selected];
  if (!rect) return;
  const ctx = canvas.getContext('2d');
  const lw = Math.max(3, state.size.w * 0.004);
  ctx.strokeStyle = state.accent;
  ctx.lineWidth = lw;
  ctx.strokeRect(rect.x + lw, rect.y + lw, rect.w - 2 * lw, rect.h - 2 * lw);
  const label = `PANEL ${state.selected + 1}`;
  ctx.font = `700 ${Math.max(14, state.size.h * 0.022)}px system-ui, sans-serif`;
  const tw = ctx.measureText(label).width;
  const pad = 10;
  const lh = Math.max(22, state.size.h * 0.032);
  ctx.fillStyle = state.accent;
  ctx.fillRect(rect.x + lw, rect.y + lw, tw + pad * 2, lh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + lw + pad, rect.y + lw + lh / 2);
}

/** Rebuilds the photo thumbnails, marking the one the selected panel shows. */
function renderThumbs() {
  thumbs.innerHTML = '';
  const selectedPhoto = state.panels[state.selected]?.photo ?? -1;
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb' + (i === selectedPhoto ? ' active' : '');
    button.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    button.appendChild(img);
    button.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      renderThumbs();
      redraw();
    });
    thumbs.appendChild(button);
  });
}

/** Builds the layout, caption-colour and size buttons from the renderer's tables. */
function buildButtons() {
  const layouts = document.getElementById('layouts');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = layout.label;
    button.dataset.layout = key;
    button.addEventListener('click', () => {
      state.layout = key;
      freshPanels();
      syncControls();
      redraw();
    });
    layouts.appendChild(button);
  });
  const colors = document.getElementById('caption-colors');
  Object.entries(CAPTION_COLORS).forEach(([key, color]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.textContent = color.label;
    button.dataset.color = key;
    button.style.setProperty('--swatch', color.bottom);
    button.addEventListener('click', () => {
      state.captionColor = key;
      state.accent = key === 'cyan' ? '#2fd4ff' : key === 'pink' ? '#ff5ea8' : '#ff2e88';
      syncControls();
      redraw();
    });
    colors.appendChild(button);
  });
  const sizes = document.getElementById('sizes');
  SIZES.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = size.label;
    button.dataset.size = `${size.w}x${size.h}`;
    button.addEventListener('click', () => {
      state.size = size;
      syncControls();
      redraw();
    });
    sizes.appendChild(button);
  });
}

/** Brings every control in line with the state (used after a scene or a layout change). */
function syncControls() {
  document.getElementById('caption').value = state.caption;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('caption-size').value = String(state.captionScale);
  document.getElementById('caption-y').value = String(state.captionY);
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#caption-colors button').forEach((b) => b.classList.toggle('active', b.dataset.color === state.captionColor));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('active', b.dataset.size === `${state.size.w}x${state.size.h}`));
  const panel = state.panels[state.selected];
  zoomInput.value = String(panel ? panel.zoom : 1.15);
  renderThumbs();
}

/** Adds loaded photos to the library and fills any empty panel with them. */
function addPhotos(list) {
  state.photos.push(...list);
  freshPanels();
  syncControls();
  redraw();
}

/** Loads the two free sample photos and fills the cover with them. */
async function loadSamples() {
  const loaded = [];
  for (const name of ['pier', 'boulevard']) {
    if (state.photos.some((p) => p.name === name)) continue;
    const img = await loadImage(`samples/${name}.jpg`);
    loaded.push({ img, name, src: `samples/${name}.jpg` });
  }
  if (loaded.length > 0) addPhotos(loaded);
  status.textContent = loaded.length > 0 ? 'Sample photos loaded.' : 'Sample photos are already in.';
}

/** Stages a fixed scene for a screenshot: photos, layout, caption, then the cover. */
export async function applyScene(scene) {
  state.size = scene.size;
  state.layout = scene.layout;
  state.caption = scene.caption;
  state.tagline = scene.tagline;
  state.captionColor = scene.captionColor ?? 'white';
  state.accent = scene.accent ?? '#ff2e88';
  state.photos = [];
  for (const name of scene.photos) {
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push({ img, name, src: `samples/${name}.jpg` });
  }
  freshPanels();
  scene.assign.forEach((photoIdx, panelIdx) => {
    if (state.panels[panelIdx]) {
      state.panels[panelIdx].photo = photoIdx;
      state.panels[panelIdx].zoom = scene.zooms?.[panelIdx] ?? 1.15;
    }
  });
  state.selected = 0;
  syncControls();
  redraw();
  if (scene.coverOnly) document.body.classList.add('shot-cover');
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  const loaded = [];
  for (const file of files) {
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      loaded.push({ img, name: file.name, src: url });
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  if (loaded.length > 0) {
    addPhotos(loaded);
    status.textContent = `${loaded.length} photo${loaded.length > 1 ? 's' : ''} loaded.`;
  }
  e.target.value = '';
});
document.getElementById('samples').addEventListener('click', loadSamples);
document.getElementById('fill-all').addEventListener('click', () => {
  const photo = state.panels[state.selected]?.photo;
  if (photo === null || photo === undefined) return;
  state.panels.forEach((p) => { p.photo = photo; });
  renderThumbs();
  redraw();
});
document.getElementById('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
document.getElementById('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
document.getElementById('caption-size').addEventListener('input', (e) => { state.captionScale = Number(e.target.value); redraw(); });
document.getElementById('caption-y').addEventListener('input', (e) => { state.captionY = Number(e.target.value); redraw(); });
zoomInput.addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (panel) panel.zoom = Number(e.target.value);
  redraw();
});
document.getElementById('export').addEventListener('click', () => {
  const off = renderCover(state);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-bay-cover-${state.size.w}x${state.size.h}.png`;
    a.click();
    status.textContent = `Saved ${a.download}`;
  }, 'image/png');
});

/** Maps a pointer on the page to a point on the cover canvas, in canvas pixels. */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const index = panelAt(state.layout, state.size.w, state.size.h, point.x, point.y);
  if (index < 0) return;
  state.selected = index;
  const panel = state.panels[index];
  const rects = panelRects(state.layout, state.size.w, state.size.h);
  drag = { panel, rect: rects[index], startX: point.x, startY: point.y, px: panel.px, py: panel.py };
  canvas.setPointerCapture(e.pointerId);
  status.textContent = `Panel ${index + 1} selected — click a photo to place it, drag to pan, scroll to zoom.`;
  syncControls();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const point = canvasPoint(e);
  const photo = state.photos[drag.panel.photo ?? -1];
  if (!photo) return;
  const { rect } = drag;
  const base = Math.max(rect.w / photo.img.naturalWidth, rect.h / photo.img.naturalHeight);
  const pw = photo.img.naturalWidth * base * drag.panel.zoom;
  const ph = photo.img.naturalHeight * base * drag.panel.zoom;
  const ex = Math.max(0, pw - rect.w);
  const ey = Math.max(0, ph - rect.h);
  if (ex > 0) drag.panel.px = Math.max(-1, Math.min(1, drag.px + ((point.x - drag.startX) * 2) / ex));
  if (ey > 0) drag.panel.py = Math.max(-1, Math.min(1, drag.py + ((point.y - drag.startY) * 2) / ey));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  zoomInput.value = String(panel.zoom);
  redraw();
}, { passive: false });

buildButtons();
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, applyScene);
} else {
  freshPanels();
  syncControls();
  redraw();
}
