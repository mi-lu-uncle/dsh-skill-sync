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

fs.rmSync(tmp, { recursive: true, force: true });
console.log('smoke: OK');
