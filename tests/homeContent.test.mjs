import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/features/home/homeContent.ts', import.meta.url);
let source;

try {
  source = await readFile(sourceUrl, 'utf8');
} catch {
  source = 'export const workflowSteps = []; export const faqItems = [];';
}

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { workflowSteps, faqItems } = await import(moduleUrl);

test('defines the three real product workflow steps', () => {
  assert.deepEqual(
    workflowSteps.map((step) => step.label),
    ['Create Room', 'Complete Roll Call', 'Run the Session']
  );
  assert.ok(workflowSteps.every((step) => step.imageSrc.endsWith('.webp')));
  assert.ok(workflowSteps.every((step) => step.imageAlt.length > 20));
});

test('defines six homepage FAQs including beta pricing', () => {
  assert.equal(faqItems.length, 6);
  const pricing = faqItems.find((item) => item.question === 'Is MUN Chair free?');
  assert.ok(pricing);
  assert.match(pricing.answer, /beta/i);
  assert.match(pricing.answer, /no paid features/i);
});
