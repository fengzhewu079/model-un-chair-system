import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/visitorAnalytics.ts', import.meta.url), 'utf8')
  .catch(() => 'export const sanitizePageView = null; export const isAnalyticsHost = null;');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { sanitizePageView, isAnalyticsHost } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('analytics keeps only a public pageview URL, stripping query, hash and extra data', () => {
  assert.equal(typeof sanitizePageView, 'function');
  const event = { type: 'pageview', url: 'https://munchair.com/?pin=secret&room=test#token', payload: { delegate: 'Private' } };
  assert.deepEqual(sanitizePageView(event), { type: 'pageview', url: 'https://munchair.com/' });
  assert.equal(event.url, 'https://munchair.com/?pin=secret&room=test#token');
});

test('analytics excludes custom events, invalid/private paths and non-production hosts', () => {
  assert.equal(typeof sanitizePageView, 'function');
  for (const url of ['bad-url', 'http://munchair.com/', 'https://munchair.com/room/private', 'https://munchair.com.evil.test/', 'http://localhost:4175/', 'https://preview.vercel.app/']) {
    assert.equal(sanitizePageView({ type: 'pageview', url }), null, url);
  }
  assert.equal(sanitizePageView({ type: 'event', url: 'https://munchair.com/' }), null);
  assert.ok(isAnalyticsHost('munchair.com'));
  assert.ok(isAnalyticsHost('model-un-chair-system.vercel.app'));
  assert.ok(!isAnalyticsHost('localhost'));
});
