import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('public homepage renders meaningful HTML without browser globals or meeting data', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { HomePage } = await vite.ssrLoadModule('/src/pages/HomePage.tsx');
    let html;
    assert.doesNotThrow(() => {
      html = renderToStaticMarkup(React.createElement(HomePage, {
        onCreateRoom() {}, onJoinRoom() {}, onStartDemo() {}, walkthroughUrl: null,
      }));
    }, 'public content must render before JavaScript runs');
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /Free Model UN chairing software/);
    for (const text of ['Attendance', 'Speakers', 'Paper presentations', 'Do I need an account?', 'Create Room', 'Join Room']) {
      assert.ok(html.includes(text), `missing public content: ${text}`);
    }
    assert.doesNotMatch(html, /memberToken|shared_payload|sessionId|service_role/);
  } finally {
    await vite.close();
  }
});
