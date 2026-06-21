// Generates Android adaptive-icon source layers for @capacitor/assets, from the
// Almond mark (a #BDB3FF circle on #FAF9F5 cream). Run: node scripts/gen-app-icon.mjs
// Then: npx capacitor-assets generate --android
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const PURPLE = '#BDB3FF';
const CREAM = '#FAF9F5';
const OUT = new URL('../assets/', import.meta.url);
await mkdir(OUT, { recursive: true });

const S = 1024;
// Adaptive foreground: purple circle in the ~66% safe zone, transparent rest.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="33" fill="${PURPLE}"/></svg>`;
// Adaptive background: solid cream.
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${CREAM}"/></svg>`;
// Legacy (square/round) icon: cream with a larger purple circle.
const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${CREAM}"/><circle cx="50" cy="50" r="40" fill="${PURPLE}"/></svg>`;

const render = (svg, name) =>
  sharp(Buffer.from(svg)).resize(S, S).png().toFile(new URL(name, OUT).pathname);

await Promise.all([
  render(foreground, 'icon-foreground.png'),
  render(background, 'icon-background.png'),
  render(iconOnly, 'icon-only.png'),
]);
console.log('Wrote assets/: icon-foreground.png, icon-background.png, icon-only.png');
