import { cp, mkdir } from 'node:fs/promises';
// Serve PDF fonts/codecs from this site; local document contents never leave the browser.
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  const destination = new URL(`../public/pdfjs-assets/${directory}/`, import.meta.url);
  await mkdir(destination, {recursive: true});
  await cp(new URL(`../node_modules/pdfjs-dist/${directory}/`, import.meta.url), destination, {recursive: true});
}
