import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/utils/motionVotingOrder.ts', import.meta.url), 'utf8').catch(() => 'export const suggestMotionOrder = null; export const applyMotionOrder = null;');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { suggestMotionOrder, applyMotionOrder } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const motion = (id, type, totalTime, speakingTime) => ({id,type,status:'pending',parameters:{totalTime,speakingTime}});
test('caucus suggestions use type, duration and selectable speech tie break without changing other motion slots', () => {
  assert.equal(typeof suggestMotionOrder, 'function');
  const motions = [motion('short','moderated_caucus',300,60),motion('paper','paper_presentation',600),motion('long','moderated_caucus',600,60),motion('unmod','unmoderated_caucus',120),motion('more','moderated_caucus',600,30)];
  assert.deepEqual(suggestMotionOrder(motions,'more-speakers'), ['unmod','paper','more','long','short']);
  assert.deepEqual(suggestMotionOrder(motions,'longer-speeches'), ['unmod','paper','long','more','short']);
  assert.deepEqual(motions.map(m=>m.id),['short','paper','long','unmod','more']);
});
test('equal suggestions stay stable and restored chair order rejects stale or duplicate IDs', () => {
  assert.equal(typeof applyMotionOrder, 'function');
  const motions = [motion('a','moderated_caucus',300,60),motion('b','moderated_caucus',300,60),motion('c','round_robin')];
  assert.deepEqual(suggestMotionOrder(motions,'more-speakers'),['a','b','c']);
  assert.deepEqual(applyMotionOrder(motions,['b','missing','b','a']).map(m=>m.id),['b','a','c']);
  assert.equal(applyMotionOrder(motions,['b'])[0],motions[1]);
});
test('real moderated motions derive their allocated duration from speaker count', () => {
  const a = motion('a','moderated_caucus',undefined,60);
  a.parameters.totalSpeakers = 5;
  const b = motion('b','moderated_caucus',undefined,30);
  b.parameters.totalSpeakers = 20;
  assert.deepEqual(suggestMotionOrder([a,b],'more-speakers'),['b','a']);
});
test('order proposed preserves mod before unmod, including other types and either tie rule', () => {
  const motions = [motion('mod','moderated_caucus',300,60),motion('unmod','unmoderated_caucus',600),motion('paper','paper_presentation',900)];
  for (const rule of ['more-speakers','longer-speeches']) {
    assert.deepEqual(suggestMotionOrder(motions,rule,'proposed'),['mod','unmod','paper']);
  }
  assert.deepEqual(suggestMotionOrder(motions,'more-speakers','disruptive'),['unmod','mod','paper']);
});
