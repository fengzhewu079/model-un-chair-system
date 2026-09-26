import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const dir = await mkdtemp(join(tmpdir(), 'mun-tests-'));
try {
  await build({entryPoints:['tests/regression.test.ts'],outfile:join(dir,'test.mjs'),bundle:true,platform:'node',format:'esm',define:{'import.meta.env':'{}'}});
  const result = spawnSync(process.execPath,['--test',join(dir,'test.mjs')],{stdio:'inherit'});
  process.exitCode = result.status ?? 1;
} finally { await rm(dir,{recursive:true,force:true}); }
