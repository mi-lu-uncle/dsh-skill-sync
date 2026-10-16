/**
 * `/skills-sync` — run the mattpocock skills sync script.
 *
 * The sync script (default `~/.dsh/bin/mattpocock-skills-sync.sh`) does both
 * halves of an update: `git pull --ff-only` on the mirror, then reconciling the
 * symlinks in the skill root so newly added skills appear and removed skills'
 * stale links are cleaned up. This plugin is a thin wrapper that runs that
 * script on demand and (optionally) on a timer.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);

/** Cordis plugin identity. */
export const name = 'skill-sync';

/** Services this plugin uses: only the command registry. */
export const inject = ['commands'];

/** Default sync script, installed by this project's setup. */
const DEFAULT_SCRIPT = () => join(homedir(), '.dsh', 'bin', 'mattpocock-skills-sync.sh');
/** Default timer cadence when `auto` is enabled. */
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Register the `/skills-sync` command and the opt-in auto timer.
 * @param ctx - Context carrying the command registry.
 * @param config - `{ script?: string, intervalMs?: number, auto?: boolean }`.
 */
export function apply(ctx, config = {}) {
  const script = typeof config.script === 'string' && config.script !== '' ? config.script : DEFAULT_SCRIPT();
  const intervalMs = Number.isInteger(config.intervalMs) && config.intervalMs > 0 ? config.intervalMs : DEFAULT_INTERVAL_MS;
  const auto = config.auto === true;

  const runSync = async () => {
    try {
      const { stdout, stderr } = await run('bash', [script], {
        encoding: 'utf8',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      });
      const text = `${stdout}${stderr ? `\n${stderr}` : ''}`.trim();
      return { kind: 'success', text };
    } catch (error) {
      const detail = (error && (error.stderr || error.message)) || String(error);
      return { kind: 'error', text: `更新失败：${String(detail).trim()}` };
    }
  };

  ctx.commands.register({
    name: 'skills-sync',
    description: 'Pull the latest mattpocock skills and re-sync their links',
    recordInput: false,
    async handler() {
      return runSync();
    },
  });

  if (!auto) return;

  ctx.effect(function* () {
    const timer = setInterval(() => {
      void runSync();
    }, intervalMs);
    yield () => clearInterval(timer);
  });
}
