import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/utils/appNavigation.ts', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { getRequestedAppView, normalizeWalkthroughUrl, resolveAppView } = await import(moduleUrl);

test('maps homepage hashes to the intended entry view', () => {
  assert.deepEqual(getRequestedAppView('#create'), { view: 'setup', entryMode: 'host' });
  assert.deepEqual(getRequestedAppView('#join'), { view: 'setup', entryMode: 'chair' });
  assert.deepEqual(getRequestedAppView('#demo'), { view: 'demo', entryMode: null });
  assert.deepEqual(getRequestedAppView(''), { view: 'home', entryMode: null });
});

test('keeps recovered live and setup sessions ahead of lobby routes', () => {
  assert.equal(
    resolveAppView({
      requestedView: 'home',
      hasCollaborationRoom: true,
      rollCallCompleted: true,
    }),
    'session'
  );
  assert.equal(
    resolveAppView({
      requestedView: 'demo',
      hasCollaborationRoom: true,
      rollCallCompleted: false,
    }),
    'setup'
  );
});

test('keeps an active demo inside the demo container after roll call is complete', () => {
  assert.equal(
    resolveAppView({
      requestedView: 'demo',
      hasCollaborationRoom: false,
      rollCallCompleted: true,
      isDemoMode: true,
    }),
    'demo'
  );
  assert.equal(
    resolveAppView({
      requestedView: 'home',
      hasCollaborationRoom: false,
      rollCallCompleted: true,
      isDemoMode: true,
    }),
    'demo'
  );
});

test('shows lobby routes only when no collaboration room is active', () => {
  assert.equal(
    resolveAppView({
      requestedView: 'home',
      hasCollaborationRoom: false,
      rollCallCompleted: false,
    }),
    'home'
  );
  assert.equal(
    resolveAppView({
      requestedView: 'setup',
      hasCollaborationRoom: false,
      rollCallCompleted: false,
    }),
    'setup'
  );
  assert.equal(
    resolveAppView({
      requestedView: 'demo',
      hasCollaborationRoom: false,
      rollCallCompleted: false,
    }),
    'demo'
  );
});

test('uses only safe configured walkthrough links', () => {
  assert.equal(normalizeWalkthroughUrl(undefined), null);
  assert.equal(normalizeWalkthroughUrl('   '), null);
  assert.equal(
    normalizeWalkthroughUrl(' https://www.youtube.com/watch?v=mun-chair '),
    'https://www.youtube.com/watch?v=mun-chair'
  );
  assert.equal(normalizeWalkthroughUrl('javascript:alert(1)'), null);
});
