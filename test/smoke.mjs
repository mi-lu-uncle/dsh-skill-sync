/**
 * Tests the thin `/skills-sync` wrapper: it must register one command and relay
 * the sync script's stdout as a success result, or its stderr as an error.
 * Run with any Node 22+:
 *
 *   node test/smoke.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply, inject, name } from '../lib/index.js';

assert.equal(name, 'skill-sync');
assert.deepEqual(inject, ['commands']);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-sync-'));

// Successful script.
const okScript = path.join(tmp, 'ok.sh');
fs.writeFileSync(okScript, 'echo "OK-fake-output"\n');
const registered = [];
apply({ commands: { register: (d) => registered.push(d) }, effect: () => {}, logger: null }, { script: okScript, auto: false });
assert.equal(registered.length, 1);
assert.equal(registered[0].name, 'skills-sync');
assert.equal(registered[0].recordInput, false);
const ok = await registered[0].handler({});
assert.equal(ok.kind, 'success');
assert.match(ok.text, /OK-fake-output/);

// Failing script surfaces stderr as an error outcome.
const badScript = path.join(tmp, 'bad.sh');
fs.writeFileSync(badScript, 'echo "boom" >&2\nexit 1\n');
const registered2 = [];
apply({ commands: { register: (d) => registered2.push(d) }, effect: () => {}, logger: null }, { script: badScript, auto: false });
const err = await registered2[0].handler({});
assert.equal(err.kind, 'error');
assert.match(err.text, /boom/);

// Concurrent manual and timer calls must share one script process.
const countFile = path.join(tmp, 'calls');
const slowScript = path.join(tmp, 'slow.sh');
fs.writeFileSync(slowScript, 'echo call >> "$COUNT_FILE"\nsleep 0.2\necho done\n');
process.env.COUNT_FILE = countFile;
const parallel = [];
let timerTick;
const realSetInterval = globalThis.setInterval;
try {
  globalThis.setInterval = (fn) => { timerTick = fn; return 0; };
  apply({ commands: { register: (d) => parallel.push(d) }, effect: (fn) => fn().next() }, { script: slowScript, auto: true });
} finally {
  globalThis.setInterval = realSetInterval;
}
timerTick();
const [one, two] = await Promise.all([parallel[0].handler({}), parallel[0].handler({})]);
assert.equal(one.kind, 'success');
assert.deepEqual(two, one);
assert.equal(fs.readFileSync(countFile, 'utf8').trim().split('\n').length, 1);
await parallel[0].handler({});
assert.equal(fs.readFileSync(countFile, 'utf8').trim().split('\n').length, 2, 'a later call runs again');
delete process.env.COUNT_FILE;

// With no custom script, execute the bundled one even on a clean HOME.
const previousRepo = process.env.MATTPOCOCK_REPO;
process.env.MATTPOCOCK_REPO = path.join(tmp, 'missing-mirror');
const defaults = [];
apply({ commands: { register: (d) => defaults.push(d) } }, {});
const missingMirror = await defaults[0].handler({});
assert.equal(missingMirror.kind, 'error');
assert.match(missingMirror.text, /找不到技能镜像/);
if (previousRepo === undefined) delete process.env.MATTPOCOCK_REPO;
else process.env.MATTPOCOCK_REPO = previousRepo;

fs.rmSync(tmp, { recursive: true, force: true });
console.log('smoke: OK');
