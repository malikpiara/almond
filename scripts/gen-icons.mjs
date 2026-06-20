// Generates PWA icons from the Almond mark (a #BDB3FF circle) into public/icons/.
// Run: pnpm icons
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const PURPLE = '#BDB3FF';
const CREAM = '#FAF9F5';
const OUT = new URL('../public/icons/', import.meta.url);

await mkdir(OUT, { recursive: true });

// Full-bleed circle on transparent — the standard "any" purpose icon.
const any = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${PURPLE}"/></svg>`;

// Maskable: circle padded to the ~80% safe zone on a solid cream square, so
// Android's adaptive mask never clips into the mark.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${CREAM}"/><circle cx="50" cy="50" r="33" fill="${PURPLE}"/></svg>`;

// Apple touch icon: no transparency (iOS draws on it); slight margin on cream.
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${CREAM}"/><circle cx="50" cy="50" r="40" fill="${PURPLE}"/></svg>`;

const render = (svg, size, name) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(new URL(name, OUT).pathname);

await Promise.all([
  render(any, 192, 'pwa-192.png'),
  render(any, 512, 'pwa-512.png'),
  render(maskable, 512, 'pwa-512-maskable.png'),
  render(apple, 180, 'apple-touch-icon-180.png'),
]);

console.log('Generated public/icons/: pwa-192, pwa-512, pwa-512-maskable, apple-touch-icon-180');
