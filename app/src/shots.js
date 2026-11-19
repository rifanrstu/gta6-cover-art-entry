// Fixed scenes for screenshots and review links.
// ?shot=cover renders one exported cover full-frame at the canvas's export size;
// ?shot=editor shows the editor with photos loaded and a panel selected.
// Query params: layout, grade, caption, subtitle, badge, stars, size (a key of
// EXPORT_SIZES), photos (comma list of sample names, cycled across the panels).
// window.__shotReady flips true once the scene has painted two frames.
export async function runShot(shot, query, api) {
  const sizeId = query.get('size') ?? (shot === 'cover' ? 'wide' : 'square');
  const photoNames = (query.get('photos') ?? query.get('photo') ?? 'boulevard,pier').split(',').map((s) => s.trim()).filter(Boolean);
  const captions = {
    caption: query.get('caption') ?? 'NEON COAST',
    subtitle: query.get('subtitle') ?? 'vice nights, fast cars',
    badge: query.get('badge') ?? 'Launch Week',
    stars: Number(query.get('stars') ?? 5),
    layout: query.get('layout') ?? (shot === 'cover' ? 'hero' : 'nine'),
    grade: query.get('grade') ?? (shot === 'cover' ? 'sunset' : 'neon'),
  };
  await api.loadSamples(photoNames, captions, sizeId, shot === 'cover');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
