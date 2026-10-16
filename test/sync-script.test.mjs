/**
 * End-to-end test of the sync script against a throwaway local git remote, so
 * the pull + symlink-reconciliation behavior is exercised without GitHub.
 *
 *   node test/sync-script.test.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.join(process.env.HOME, '.dsh', 'bin', 'mattpocock-skills-sync.sh');
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'matt-sync-'));
const origin = path.join(tmp, 'origin.git');
sh('git', ['init', '--bare', '--initial-branch=main', origin]);
const repo = path.join(tmp, 'mirror');
sh('git', ['clone', '--quiet', origin, repo]);
const dest = path.join(tmp, 'dest');

const mkSkill = (cat, name) => {
  const dir = path.join(repo, 'skills', cat, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: d\n---\nbody`);
};
const commit = (msg) => {
  sh('git', ['-C', repo, 'add', '.']);
  sh('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--quiet', '-m', msg]);
  sh('git', ['-C', repo, 'push', '--quiet', 'origin', 'main']);
};
const runSync = () => sh('bash', [SCRIPT], { env: { ...process.env, MATTPOCOCK_REPO: repo, MATTPOCOCK_DEST: dest } });

// Initial: engineering/{aaa,bbb}, misc/ccc, deprecated/ddd.
mkSkill('engineering', 'aaa');
mkSkill('engineering', 'bbb');
mkSkill('misc', 'ccc');
mkSkill('deprecated', 'ddd');
commit('initial');
runSync();
assert.ok(fs.existsSync(path.join(dest, 'aaa')), 'aaa linked');
assert.ok(fs.existsSync(path.join(dest, 'bbb')), 'bbb linked');
assert.ok(!fs.existsSync(path.join(dest, 'ccc')), 'misc skipped');
assert.ok(!fs.existsSync(path.join(dest, 'ddd')), 'deprecated skipped');

// Upstream change from a second clone: add eee, move bbb -> deprecated.
const contrib = path.join(tmp, 'contrib');
sh('git', ['clone', '--quiet', origin, contrib]);
fs.mkdirSync(path.join(contrib, 'skills', 'engineering', 'eee'), { recursive: true });
fs.writeFileSync(path.join(contrib, 'skills', 'engineering', 'eee', 'SKILL.md'), '---\nname: eee\ndescription: d\n---\n');
fs.rmSync(path.join(contrib, 'skills', 'engineering', 'bbb'), { recursive: true, force: true });
fs.mkdirSync(path.join(contrib, 'skills', 'deprecated', 'bbb'), { recursive: true });
fs.writeFileSync(path.join(contrib, 'skills', 'deprecated', 'bbb', 'SKILL.md'), '---\nname: bbb\ndescription: d\n---\n');
sh('git', ['-C', contrib, 'add', '.']);
sh('git', ['-C', contrib, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--quiet', '-m', 'change']);
sh('git', ['-C', contrib, 'push', '--quiet', 'origin', 'main']);

const out = runSync();
assert.ok(fs.existsSync(path.join(dest, 'aaa')), 'aaa kept');
assert.ok(fs.existsSync(path.join(dest, 'eee')), 'new eee linked');
assert.ok(!fs.existsSync(path.join(dest, 'bbb')), 'bbb moved to deprecated -> stale link removed');
assert.ok(!fs.existsSync(path.join(dest, 'ccc')), 'misc still skipped');
assert.match(out, /已更新/);
assert.match(out, /清理死链 1 个/);

console.log(out.trim());
console.log('sync-script: OK');
fs.rmSync(tmp, { recursive: true, force: true });
