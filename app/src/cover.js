// Neon Bay Cover Art — the cover renderer. drawCover(canvas, state) paints the whole
// poster: the photo panels, the Vice City sunset grade, the synthwave sun and the bold
// caption lettering. It is pure, so the editor preview, the PNG export and the fixed
// screenshot scenes all call it with the same state: what you see is what you download.

/** The three post sizes the app exports, in pixels. */
export const SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

/** The panel layouts, with how many photo panels each one holds. */
export const LAYOUTS = {
  hero: { label: 'Hero + strip', panels: 3 },
  quad: { label: 'Four panels', panels: 4 },
  triptych: { label: 'Triptych', panels: 3 },
  single: { label: 'One photo', panels: 1 },
};

/** Caption colour pairs: the gradient the big lettering is filled with. */
export const CAPTION_COLORS = {
  white: { label: 'White gold', top: '#ffffff', bottom: '#ffd166' },
  gold: { label: 'Gold', top: '#fff3b0', bottom: '#ff9e00' },
  pink: { label: 'Neon pink', top: '#ffe3f1', bottom: '#ff5ea8' },
  cyan: { label: 'Neon cyan', top: '#e0fbff', bottom: '#2fd4ff' },
};

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** The panel rectangles for a layout, in canvas pixels, with white gutters between. */
export function panelRects(layout, w, h) {
  const g = Math.max(4, Math.round(w * 0.006));
  if (layout === 'hero') {
    const heroW = Math.round(w * 0.62);
    const rightX = heroW + g;
    const rightW = w - rightX;
    const ph = Math.round((h - g) / 2);
    return [
      { x: 0, y: 0, w: heroW, h },
      { x: rightX, y: 0, w: rightW, h: ph },
      { x: rightX, y: ph + g, w: rightW, h: ph },
    ];
  }
  if (layout === 'quad') {
    const cw = Math.round((w - g) / 2);
    const ch = Math.round((h - g) / 2);
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + g, y: 0, w: cw, h: ch },
      { x: 0, y: ch + g, w: cw, h: ch },
      { x: cw + g, y: ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'triptych') {
    const cw = Math.round((w - 2 * g) / 3);
    return [
      { x: 0, y: 0, w: cw, h },
      { x: cw + g, y: 0, w: cw, h },
      { x: 2 * (cw + g), y: 0, w: cw, h },
    ];
  }
  return [{ x: 0, y: 0, w, h }];
}

/** The index of the panel holding point (x, y), or -1 when the point is on a gutter. */
export function panelAt(layout, w, h, x, y) {
  const rects = panelRects(layout, w, h);
  return rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

/** Draws one photo into a panel, cover-fitting it with the panel's zoom and pan. */
function drawPhotoInto(ctx, img, rect, zoom, px, py) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const s = base * zoom;
  const pw = img.naturalWidth * s;
  const ph = img.naturalHeight * s;
  const ex = Math.max(0, pw - rect.w);
  const ey = Math.max(0, ph - rect.h);
  const dx = rect.x + (rect.w - pw) / 2 + (px * ex) / 2;
  const dy = rect.y + (rect.h - ph) / 2 + (py * ey) / 2;
  ctx.drawImage(img, dx, dy, pw, ph);
}

/** The sunset grade over one panel: cool violet at the top, warm orange-pink at the foot. */
function gradePanel(ctx, rect) {
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  g.addColorStop(0, 'rgba(120, 60, 200, 0.10)');
  g.addColorStop(0.55, 'rgba(255, 120, 60, 0.05)');
  g.addColorStop(1, 'rgba(255, 40, 120, 0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const v = ctx.createRadialGradient(cx, cy, Math.min(rect.w, rect.h) * 0.35, cx, cy, Math.max(rect.w, rect.h) * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 4, 24, 0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** The retro synthwave sun: a yellow-to-pink disc with slits across its lower half. */
function drawSun(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(255, 60, 140, 0.9)';
  ctx.shadowBlur = r * 0.5;
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#ffd319');
  g.addColorStop(0.55, '#ff7a3d');
  g.addColorStop(1, '#ff2975');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1b0f2e';
  let y = cy + r * 0.08;
  let th = r * 0.07;
  while (y < cy + r) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, th);
    y += th * 2.4;
    th *= 1.35;
  }
  ctx.restore();
}

/** The caption band: the dark gradient, the bold gradient lettering, the accent rule. */
function drawCaption(ctx, w, h, state) {
  const text = (state.caption || '').trim().toUpperCase();
  const tag = (state.tagline || '').trim().toUpperCase();
  if (!text && !tag) return;
  const bandY = h * 0.58;
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, 'rgba(16, 6, 32, 0)');
  band.addColorStop(0.55, 'rgba(16, 6, 32, 0.55)');
  band.addColorStop(1, 'rgba(16, 6, 32, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, h - bandY);
  const colors = CAPTION_COLORS[state.captionColor] ?? CAPTION_COLORS.white;
  const accent = state.accent || '#ff2e88';
  const baseY = h * (state.captionY ?? 0.88);
  if (text) {
    let size = h * 0.115 * (state.captionScale ?? 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${size}px system-ui, "Segoe UI", Arial, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(1, Math.round(size * 0.02))}px`;
    while (ctx.measureText(text).width > w * 0.92 && size > 12) {
      size -= 2;
      ctx.font = `900 ${size}px system-ui, "Segoe UI", Arial, sans-serif`;
    }
    const fill = ctx.createLinearGradient(0, baseY - size, 0, baseY);
    fill.addColorStop(0, colors.top);
    fill.addColorStop(1, colors.bottom);
    ctx.lineJoin = 'round';
    ctx.shadowColor = accent;
    ctx.shadowBlur = size * 0.14;
    ctx.fillStyle = fill;
    ctx.fillText(text, w / 2, baseY);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(24, 6, 40, 0.95)';
    ctx.strokeText(text, w / 2, baseY);
  }
  if (tag) {
    const tSize = Math.max(10, h * 0.03);
    ctx.font = `700 ${tSize}px system-ui, "Segoe UI", Arial, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(2, Math.round(tSize * 0.35))}px`;
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.fillText(tag, w / 2, baseY + h * 0.052);
  }
  const barW = w * 0.28;
  const barH = Math.max(3, h * 0.006);
  const barY = baseY + h * 0.02;
  const bar = ctx.createLinearGradient(w / 2 - barW / 2, 0, w / 2 + barW / 2, 0);
  bar.addColorStop(0, accent);
  bar.addColorStop(1, '#2fd4ff');
  ctx.fillStyle = bar;
  ctx.fillRect(w / 2 - barW / 2, barY, barW, barH);
}

/** Paints the whole cover onto `canvas` at the state's size and returns the canvas. */
export function drawCover(canvas, state) {
  const { w, h } = state.size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b0f2e';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || {};
    const photo = state.photos[panel.photo ?? -1];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPhotoInto(ctx, photo.img, rect, panel.zoom ?? 1.15, panel.px ?? 0, panel.py ?? 0);
    } else {
      ctx.fillStyle = '#2a1745';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradePanel(ctx, rect);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  if (state.layout === 'hero' || state.layout === 'triptych') {
    const first = rects[0];
    drawSun(ctx, first.x + first.w * 0.76, first.y + first.h * 0.15, Math.min(first.w, first.h) * 0.15);
  }
  drawCaption(ctx, w, h, state);
  const lw = Math.max(3, w * 0.004);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
  return canvas;
}

/** Renders the cover onto a fresh offscreen canvas, for the PNG export. */
export function renderCover(state) {
  return drawCover(document.createElement('canvas'), state);
}
