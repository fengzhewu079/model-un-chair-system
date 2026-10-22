import { readFile, writeFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Public content only: never import the app store or restore a meeting during a build.
// createRoot replaces this initial document in the browser; it is not hydrated.
const vite = await createServer({
  mode: 'production', server: { middlewareMode: true }, appType: 'custom',
});
try {
  const { HomePage } = await vite.ssrLoadModule('/src/pages/HomePage.tsx');
  const { normalizeWalkthroughUrl } = await vite.ssrLoadModule('/src/utils/appNavigation.ts');
  const home = renderToStaticMarkup(React.createElement(HomePage, {
    onCreateRoom() {}, onJoinRoom() {}, onStartDemo() {},
    walkthroughUrl: normalizeWalkthroughUrl(vite.config.env.VITE_WALKTHROUGH_VIDEO_URL),
  }));
  const indexPath = new URL('../dist/index.html', import.meta.url);
  const index = await readFile(indexPath, 'utf8');
  if (!index.includes('<div id="root"></div>')) throw new Error('Missing homepage prerender mount');
  await writeFile(indexPath, index.replace('<div id="root"></div>',
    `<div id="root"><div class="app-vitality text-base" data-app-view="home">${home}</div></div>`));

  if (process.env.VERCEL_ENV === 'preview') {
    for (const page of ['index.html', 'privacy.html']) {
      const file = new URL(`../dist/${page}`, import.meta.url);
      const html = await readFile(file, 'utf8');
      await writeFile(file, html.replace('</head>', '<meta name="robots" content="noindex, nofollow" /></head>'));
    }
    await writeFile(new URL('../dist/robots.txt', import.meta.url), 'User-agent: *\nDisallow: /\n');
  }
  console.log('Public homepage prerendered; meeting workflows remain client-side.');
} finally {
  await vite.close();
}
