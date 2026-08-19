// Renders public/og.png — the Open Graph card every share of the site shows.
//
// The card is drawn as SVG and rasterised with resvg, so it is a build step
// and not a design tool export: run `npm run og` after changing the headline
// or the brand ramp and commit the PNG. The dot field is a halftone of the
// same kind the DotCut canvas paints on the auth screen, drawn procedurally so
// the card shares the site's one visual signature without a screenshot.
//
// Fonts: IBM Plex Sans / Mono, fetched from IBM's repository into a cache
// directory on first run. The site loads the same families from Google Fonts,
// so the card is set in the type the page is set in.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, 'node_modules', '.cache', 'og-fonts');
const out = join(root, 'public', 'og.png');

const FONT_BASE = 'https://raw.githubusercontent.com/IBM/plex/master/packages';
const FONTS = [
  ['plex-sans', 'IBMPlexSans-SemiBold.ttf'],
  ['plex-sans', 'IBMPlexSans-Regular.ttf'],
  ['plex-mono', 'IBMPlexMono-Regular.ttf'],
];

async function fontFiles() {
  await mkdir(cache, { recursive: true });
  const files = [];
  for (const [pkg, file] of FONTS) {
    const path = join(cache, file);
    try {
      await access(path);
    } catch {
      const res = await fetch(`${FONT_BASE}/${pkg}/fonts/complete/ttf/${file}`);
      if (!res.ok) throw new Error(`font fetch failed: ${file} (${res.status})`);
      await writeFile(path, Buffer.from(await res.arrayBuffer()));
    }
    files.push(path);
  }
  return files;
}

const W = 1200;
const H = 630;

// Mint ramp — the same steps as src/index.css.
const PAPER = '#fbfcfb';
const INK = '#0d1512';
const MUTED = '#55625c';
const MINT_4 = '#bbf6db';
const MINT_8 = '#00ce91';
const MINT_11 = '#006f40';
const MINT_12 = '#00482a';

/**
 * Halftone gust. Cell radius follows a smooth field that swells toward the
 * right edge and thins to nothing before it reaches the copy, so the dots
 * read as a wind moving across the card rather than a texture behind text.
 */
function dotField() {
  const cell = 18;
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil(H / cell);
  const parts = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cell + cell / 2;
      const py = y * cell + cell / 2;
      const u = x / cols;
      const v = y / rows;
      // Two crossing waves, like the engine's `drift` style.
      const a = Math.sin(x * 0.41 + y * 0.23);
      const b = Math.sin(x * 0.17 - y * 0.53 + 2.1);
      const wave = ((a + b) * 0.5 + 1) / 2; // 0..1
      // Fade in from the left so the copy column stays clean, and lift toward
      // the top-right corner where the gust is strongest.
      const gate = Math.min(1, Math.max(0, (u - 0.5) / 0.22));
      const lift = 0.55 + 0.45 * (1 - v) * u;
      const s = wave * gate * lift;
      if (s < 0.08) continue;
      const r = (cell / 2) * 0.92 * s;
      // Deeper mint where the dot is largest.
      const fill = s > 0.62 ? MINT_11 : s > 0.36 ? MINT_8 : MINT_4;
      parts.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="${fill}"/>`
      );
    }
  }
  return parts.join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g opacity="0.95">${dotField()}</g>
  <!-- Paper scrim so the dots never touch the copy -->
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.46" stop-color="${PAPER}" stop-opacity="1"/>
      <stop offset="0.66" stop-color="${PAPER}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${MINT_8}"/>
      <stop offset="1" stop-color="${MINT_11}"/>
    </linearGradient>
  </defs>

  <!-- Brand -->
  <rect x="80" y="78" width="44" height="44" rx="12" fill="url(#mark)"/>
  <!-- Lucide "wind", scaled into the mark -->
  <g transform="translate(90 88) scale(1)" fill="none" stroke="${MINT_12}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.8 19.6A2 2 0 1 0 14 16H2"/>
    <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/>
    <path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>
  </g>
  <text x="140" y="110" font-family="IBM Plex Sans" font-weight="600" font-size="30" letter-spacing="-0.6" fill="${INK}">Gregale</text>

  <!-- Headline -->
  <text font-family="IBM Plex Sans" font-weight="600" font-size="60" letter-spacing="-2.1" fill="${INK}">
    <tspan x="80" y="300">Serverless on real</tspan>
    <tspan x="80" y="368">microVMs.</tspan>
  </text>
  <text font-family="IBM Plex Sans" font-weight="600" font-size="60" letter-spacing="-2.1" fill="${INK}">
    <tspan x="80" y="436">Scale to zero. Wake in</tspan>
    <tspan x="80" y="504" fill="${MINT_11}">under 350 ms.</tspan>
  </text>

  <!-- Footer line -->
  <text x="80" y="590" font-family="IBM Plex Mono" font-size="20" letter-spacing="1.4" fill="${MUTED}">gregale.dev  ·  OPEN SOURCE  ·  FIRECRACKER MICROVMS</text>
</svg>`;

const files = await fontFiles();
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles: files, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' },
});
const png = resvg.render().asPng();
await writeFile(out, png);
console.log(`wrote ${out} (${(png.length / 1024).toFixed(0)} KB)`);
