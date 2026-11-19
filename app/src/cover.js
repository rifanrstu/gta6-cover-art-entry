// Vice Cover Studio — the cover rendering engine.
// Draws a multi-panel GTA-style poster cover onto a 2D canvas: panel layouts with
// per-panel photo crop/position/zoom, Vice City colour grades (gradient washes plus
// a canvas filter pass), inked panel borders, film grain, a vignette, halftone title
// block, bold gradient caption lettering with a neon script subtitle, a heat-star
// meter and a badge ribbon. Everything is drawn here; no artwork is loaded.

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait post', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide post', w: 1920, h: 1080 },
  { id: 'story', label: 'Story', w: 1080, h: 1920 },
];

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.28) contrast(1.07) brightness(1.02)',
    wash: [[0, 'rgba(46,16,84,0.34)'], [0.45, 'rgba(255,94,98,0.16)'], [0.75, 'rgba(255,166,66,0.20)'], [1, 'rgba(255,62,130,0.30)']],
    titleA: '#ffd76a', titleB: '#ff5e8a', titleC: '#ff8a3d',
    script: '#7df9ff', sky: '#2b1055',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.35) contrast(1.12) brightness(0.98) hue-rotate(-8deg)',
    wash: [[0, 'rgba(8,10,60,0.38)'], [0.5, 'rgba(0,229,255,0.10)'], [1, 'rgba(255,0,128,0.32)']],
    titleA: '#8affff', titleB: '#38b6ff', titleC: '#e05eff',
    script: '#ff71ce', sky: '#0b1035',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.18) contrast(1.05) brightness(1.06) sepia(0.22)',
    wash: [[0, 'rgba(90,40,8,0.20)'], [0.55, 'rgba(255,176,66,0.18)'], [1, 'rgba(214,90,40,0.26)']],
    titleA: '#fff3b0', titleB: '#ffb703', titleC: '#fb8500',
    script: '#ffe9a8', sky: '#3d1d04',
  },
  ink: {
    label: 'Ink Mono',
    filter: 'saturate(0.25) contrast(1.22) brightness(1.03)',
    wash: [[0, 'rgba(10,10,18,0.30)'], [1, 'rgba(255,45,120,0.20)']],
    titleA: '#ffffff', titleB: '#d9d9e3', titleC: '#8d8da3',
    script: '#ff2d78', sky: '#101018',
  },
  candy: {
    label: 'Candy Pop',
    filter: 'saturate(1.5) contrast(1.04) brightness(1.05)',
    wash: [[0, 'rgba(120,20,140,0.22)'], [0.5, 'rgba(255,120,200,0.14)'], [1, 'rgba(60,200,255,0.22)']],
    titleA: '#ffe45e', titleB: '#ff6ec7', titleC: '#4dc9ff',
    script: '#ffffff', sky: '#35104d',
  },
};

// Panel layouts as normalised rects [x, y, w, h] plus an optional tilt in degrees.
// `title` says where the caption block sits: 'bottom', or 'band' (a reserved
// halftone strip across the top, the classic nine-panel cover grid look).
export const LAYOUTS = {
  hero: {
    label: 'Hero Grid',
    title: 'bottom',
    panels: [
      [0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5],
    ],
  },
  nine: {
    label: 'Nine Panel Grid',
    title: 'band',
    panels: [
      [0, 0.16, 1 / 3, 0.42], [1 / 3, 0.16, 1 / 3, 0.42], [2 / 3, 0.16, 1 / 3, 0.42],
      [0, 0.58, 1 / 3, 0.42], [1 / 3, 0.58, 1 / 3, 0.42], [2 / 3, 0.58, 1 / 3, 0.42],
    ],
  },
  duo: {
    label: 'Duo Split',
    title: 'bottom',
    panels: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
  },
  trio: {
    label: 'Trio Columns',
    title: 'bottom',
    panels: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
  },
  bleed: {
    label: 'Full Bleed Hero',
    title: 'bottom',
    panels: [[0, 0, 1, 1]],
  },
  tilt: {
    label: 'Tilted Snapshots',
    title: 'bottom',
    panels: [
      [0.03, 0.05, 0.52, 0.62, -4], [0.48, 0.02, 0.48, 0.55, 3],
      [0.10, 0.55, 0.44, 0.40, 2], [0.55, 0.50, 0.42, 0.45, -3],
    ],
  },
};

const noiseCanvas = document.createElement('canvas');
noiseCanvas.width = 180; noiseCanvas.height = 180;
{
  const nctx = noiseCanvas.getContext('2d');
  const img = nctx.createImageData(180, 180);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 96 + (seed % 128);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
}

function drawPhotoInPanel(ctx, photo, rect, slot) {
  const [x, y, w, h] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo || !photo.img) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a2060'); g.addColorStop(0.55, '#b23a6d'); g.addColorStop(1, '#ff9a3d');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(14, h * 0.055)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const img = photo.img;
  const zoom = slot?.zoom ?? 1;
  const fx = slot?.x ?? 0.5;
  const fy = slot?.y ?? 0.5;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = x + (w - pw) * fx;
  const dy = y + (h - ph) * fy;
  try { ctx.filter = photo.filter ?? 'none'; } catch { /* older engines */ }
  ctx.drawImage(img, dx, dy, pw, ph);
  try { ctx.filter = 'none'; } catch { /* ignore */ }
  ctx.restore();
}

function halftoneBand(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = colour;
  const step = h / 5.2;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < w / step + 2; col++) {
      const r = (step * 0.30) * (1 - Math.abs(row - 3) / 4.5);
      if (r <= 0.6) continue;
      ctx.beginPath();
      ctx.arc(x + col * step + (row % 2 ? step / 2 : 0), y + row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, weight = 900) {
  let size = startSize;
  const set = () => { ctx.font = `${weight} ${size}px "Arial Black", "Segoe UI", system-ui, sans-serif`; };
  set();
  while (ctx.measureText(text).width > maxWidth && size > 14) { size -= 3; set(); }
  return size;
}

function drawStars(ctx, cx, y, size, count, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = size * 0.08;
  const total = count * size * 1.25;
  for (let i = 0; i < count; i++) {
    const x0 = cx - total / 2 + i * size * 1.25 + size / 2;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const ang = -Math.PI / 2 + (p * Math.PI) / 5;
      const rad = p % 2 === 0 ? size / 2 : size / 5;
      const px = x0 + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawCaptionBlock(ctx, state, grade, w, h, layout) {
  const caption = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const unit = Math.min(w, h);
  if (layout.title === 'band') {
    const bh = h * 0.16;
    ctx.fillStyle = grade.sky;
    ctx.fillRect(0, 0, w, bh);
    halftoneBand(ctx, 0, 0, w, bh, 'rgba(255,255,255,0.13)');
    if (caption) {
      const size = fitFont(ctx, caption, w * 0.9, bh * 0.62);
      const grad = ctx.createLinearGradient(0, bh * 0.14, 0, bh * 0.92);
      grad.addColorStop(0, grade.titleA); grad.addColorStop(0.55, grade.titleB); grad.addColorStop(1, grade.titleC);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#14081f'; ctx.lineJoin = 'round';
      ctx.strokeText(caption, w / 2, bh * 0.52);
      ctx.fillStyle = grad;
      ctx.fillText(caption, w / 2, bh * 0.52);
      ctx.textBaseline = 'alphabetic';
    }
    if (subtitle) {
      ctx.font = `italic 600 ${unit * 0.028}px Georgia, "Segoe Script", cursive`;
      ctx.textAlign = 'right';
      ctx.fillStyle = grade.script;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
      ctx.fillText(subtitle, w * 0.985, h * 0.985);
      ctx.shadowBlur = 0;
    }
    return;
  }
  const blockH = h * (subtitle ? 0.30 : 0.25);
  const scrim = ctx.createLinearGradient(0, h - blockH, 0, h);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(0.45, 'rgba(10,4,24,0.55)');
  scrim.addColorStop(1, 'rgba(10,4,24,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - blockH, w, blockH);
  if (state.stars > 0) drawStars(ctx, w / 2, h - blockH + unit * 0.045, unit * 0.045, state.stars, '#ffd23e');
  if (caption) {
    const size = fitFont(ctx, caption, w * 0.92, unit * 0.115);
    const yBase = h - (subtitle ? unit * 0.085 : unit * 0.055);
    const grad = ctx.createLinearGradient(0, yBase - size, 0, yBase);
    grad.addColorStop(0, grade.titleA); grad.addColorStop(0.55, grade.titleB); grad.addColorStop(1, grade.titleC);
    ctx.textAlign = 'center';
    ctx.lineWidth = size * 0.17; ctx.strokeStyle = '#14081f'; ctx.lineJoin = 'round';
    // Extruded poster shadow in the grade's hot colour, offset down-right, so the
    // headline lifts off the photo like block-printed cover lettering.
    ctx.fillStyle = grade.titleC;
    ctx.fillText(caption, w / 2 + size * 0.05, yBase + size * 0.055);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowOffsetY = size * 0.06; ctx.shadowBlur = 0;
    ctx.strokeText(caption, w / 2, yBase);
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = grad;
    ctx.fillText(caption, w / 2, yBase);
  }
  if (subtitle) {
    ctx.font = `italic 600 ${unit * 0.042}px Georgia, "Segoe Script", cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.script;
    ctx.shadowColor = grade.script; ctx.shadowBlur = unit * 0.018;
    ctx.fillText(subtitle, w / 2, h - unit * 0.028);
    ctx.shadowBlur = 0;
  }
}

/** Renders the full cover described by `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  ctx.fillStyle = grade.sky;
  ctx.fillRect(0, 0, w, h);

  const gutter = Math.max(3, Math.min(w, h) * 0.006);
  layout.panels.forEach((panel, i) => {
    const [nx, ny, nw, nh, tiltDeg] = panel;
    const rect = [nx * w, ny * h, nw * w, nh * h];
    ctx.save();
    if (tiltDeg) {
      const cx = rect[0] + rect[2] / 2;
      const cy = rect[1] + rect[3] / 2;
      ctx.translate(cx, cy);
      ctx.rotate((tiltDeg * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = '#ffffff';
      const pad = gutter * 2.2;
      ctx.fillRect(rect[0] - pad, rect[1] - pad, rect[2] + pad * 2, rect[3] + pad * 2.6);
    }
    const slot = state.slots[i] ?? {};
    const photo = slot.photoIndex != null && state.photos[slot.photoIndex]
      ? { img: state.photos[slot.photoIndex], filter: grade.filter }
      : null;
    const inner = [rect[0] + gutter, rect[1] + gutter, rect[2] - gutter * 2, rect[3] - gutter * 2];
    drawPhotoInPanel(ctx, photo, inner, slot);
    const wash = ctx.createLinearGradient(0, inner[1], 0, inner[1] + inner[3]);
    grade.wash.forEach(([at, col]) => wash.addColorStop(at, col));
    ctx.fillStyle = wash;
    ctx.fillRect(inner[0], inner[1], inner[2], inner[3]);
    ctx.strokeStyle = 'rgba(12,4,24,0.9)';
    ctx.lineWidth = gutter * 1.1;
    ctx.strokeRect(inner[0], inner[1], inner[2], inner[3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(inner[0] + gutter, inner[1] + gutter, inner[2] - gutter * 2, inner[3] - gutter * 2);
    if (state.selected === i && state.showSelection) {
      ctx.strokeStyle = '#ffe23e';
      ctx.lineWidth = Math.max(3, gutter * 1.4);
      ctx.setLineDash([18, 12]);
      ctx.strokeRect(inner[0] - 2, inner[1] - 2, inner[2] + 4, inner[3] + 4);
      ctx.setLineDash([]);
    }
    ctx.restore();
  });

  const lift = ctx.createLinearGradient(0, 0, w, h);
  lift.addColorStop(0, 'rgba(255,120,180,0.06)');
  lift.addColorStop(1, 'rgba(40,10,90,0.10)');
  ctx.fillStyle = lift;
  ctx.fillRect(0, 0, w, h);
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(noiseCanvas, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,20,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawCaptionBlock(ctx, state, grade, w, h, layout);

  if (state.badge) {
    const text = state.badge.trim().toUpperCase();
    if (text) {
      const fs = Math.min(w, h) * 0.026;
      ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`;
      const tw = ctx.measureText(text).width;
      const bx = Math.min(w, h) * 0.022;
      const by = layout.title === 'band' ? h * 0.16 + Math.min(w, h) * 0.018 : Math.min(w, h) * 0.022;
      ctx.fillStyle = '#ff2d78';
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + fs * 1.5, fs * 1.9, fs * 0.4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(text, bx + fs * 0.75, by + fs * 1.32);
    }
  }
  if (state.frame !== false) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(6, Math.min(w, h) * 0.012);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.strokeStyle = 'rgba(10,4,24,0.85)';
    ctx.lineWidth = 2;
    const off = Math.max(6, Math.min(w, h) * 0.012) + 3;
    ctx.strokeRect(off, off, w - off * 2, h - off * 2);
  }
}

/** Returns the panel index under a normalised point, or -1 (last drawn panel wins). */
export function panelAt(state, nx, ny) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  let hit = -1;
  layout.panels.forEach(([px, py, pw, ph], i) => {
    if (nx >= px && nx <= px + pw && ny >= py && ny <= py + ph) hit = i;
  });
  return hit;
}

export function panelCount(state) {
  return (LAYOUTS[state.layout] ?? LAYOUTS.hero).panels.length;
}
