import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/features/demo/demoSession.ts', import.meta.url);
let source;

try {
  source = await readFile(sourceUrl, 'utf8');
} catch {
  source = 'export const createDemoSessionSeed = undefined;';
}

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { createDemoSessionSeed } = await import(moduleUrl);

test('creates a completed 15-country all-present demo roll call', () => {
  assert.equal(typeof createDemoSessionSeed, 'function', 'createDemoSessionSeed must be implemented');
  const seed = createDemoSessionSeed(new Date('2026-01-01T00:00:00.000Z'));

  assert.equal(seed.name, 'Interactive Demo Session');
  assert.equal(seed.committeeName, 'General Assembly Demo');
  assert.equal(seed.chairName, 'Demo Host');
  assert.equal(seed.rollCall.completed, true);
  assert.equal(seed.rollCall.delegates.length, 15);
  assert.equal(seed.rollCall.presentCount, 15);
  assert.equal(seed.rollCall.presentAndVotingCount, 0);
  assert.equal(seed.rollCall.absentCount, 0);
  assert.ok(seed.rollCall.delegates.every((delegate) => delegate.attendance === 'present'));
});

test('starts the demo with no speakers, motions, completed groups, or vote', () => {
  assert.equal(typeof createDemoSessionSeed, 'function', 'createDemoSessionSeed must be implemented');
  const seed = createDemoSessionSeed(new Date('2026-01-01T00:00:00.000Z'));

  assert.equal(seed.currentSpeaker, null);
  assert.deepEqual(seed.waitingQueue, []);
  assert.deepEqual(seed.speakerQueue, []);
  assert.deepEqual(seed.motions, []);
  assert.deepEqual(seed.motionGroups, []);
  assert.equal(seed.currentVote, null);
});
