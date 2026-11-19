// Fixed scenes for screenshots: ?shot=cover shows the exported landscape cover alone,
// ?shot=editor shows the editor with a sample photo loaded, ?shot=cover-square the square
// cover and ?shot=cover-portrait the portrait cover. Every scene uses the two free sample
// photos and fixed panel assignments, so the same URL always paints the same cover;
// window.__shotReady is set once it is painted.
import { SIZES } from './cover.js';

const SCENES = {
  cover: {
    size: SIZES[2],
    layout: 'hero',
    photos: ['pier', 'boulevard'],
    assign: [0, 1, 0],
    zooms: [1.15, 1.25, 1.2],
    caption: 'NEON BAY',
    tagline: 'SUNSET HEIST',
    coverOnly: true,
  },
  editor: {
    size: SIZES[2],
    layout: 'hero',
    photos: ['pier', 'boulevard'],
    assign: [0, 1, 0],
    zooms: [1.15, 1.25, 1.2],
    caption: 'NEON BAY',
    tagline: 'SUNSET HEIST',
    coverOnly: false,
  },
  'cover-square': {
    size: SIZES[0],
    layout: 'quad',
    photos: ['pier', 'boulevard'],
    assign: [0, 1, 0, 1],
    zooms: [1.2, 1.2, 1.15, 1.25],
    caption: 'NEON BAY',
    tagline: 'VICE CITY NIGHTS',
    coverOnly: true,
  },
  'cover-portrait': {
    size: SIZES[1],
    layout: 'hero',
    photos: ['boulevard', 'pier'],
    assign: [0, 1, 0],
    zooms: [1.2, 1.15, 1.25],
    caption: 'NEON BAY',
    tagline: 'PALM ROW HEIST',
    coverOnly: true,
  },
};

/** Stages the named scene with the editor's applyScene, then marks the shot ready. */
export async function runShot(shot, query, applyScene) {
  const scene = SCENES[shot] ?? SCENES.cover;
  await applyScene(scene);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
