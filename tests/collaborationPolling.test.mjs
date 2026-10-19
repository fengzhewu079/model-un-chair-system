import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('collaboration polling uses one renewal request and preserves meeting state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mun-polling-'));
  try {
    await build({
      entryPoints: ['tests/fixtures/collaborationPolling.ts'],
      outfile: join(dir, 'test.mjs'), bundle: true, platform: 'node', format: 'esm',
      define: {'import.meta.env': '{}'},
      plugins: [{
        name: 'offline-supabase',
        setup(build) {
          build.onResolve({filter: /lib\/supabase$/}, () => ({path: 'supabase', namespace: 'offline'}));
          build.onLoad({filter: /.*/, namespace: 'offline'}, () => ({contents: `
            export const isSupabaseConfigured = true;
            export const supabaseConfigMessage = 'test';
            export const supabaseUrl = 'https://example.invalid';
            export const supabasePublicKey = 'test';
            export const supabase = {rpc: (...args) => globalThis.testRpc(...args)};
          `}));
        }
      }]
    });
    const childEnv = {...process.env};
    delete childEnv.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', join(dir, 'test.mjs')], {encoding: 'utf8', env: childEnv});
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
