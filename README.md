# dsh-skill-sync

Thin wrapper around the mattpocock skills sync script, exposed as a DSH command
and an opt-in periodic timer.

## Why

DSH's filesystem skill provider hot-reloads skill directories after a `git
pull` (its watcher follows symlinks by default), but nothing triggers the pull
**or** keeps the symlinks in sync. The sync script does both halves:

1. `git pull --ff-only` the mirror, and
2. reconcile symlinks in the skill root — link newly added skills, repair moved
   ones, and remove stale links for skills that were deleted or deprecated.

This plugin just runs that script:

- a `/skills-sync` command for an immediate sync, and
- an **opt-in** periodic timer (`auto: true` to enable; default off).

## Usage

```
/skills-sync        # run the sync script now, show its report
```

## Configuration

Set these on the `skill-sync` row in your profile patch (`cordis.patch.yml`):

```yaml
- id: skill-sync
  config:
    script: /Users/you/.dsh/bin/mattpocock-skills-sync.sh  # default: ~/.dsh/bin/mattpocock-skills-sync.sh
    intervalMs: 1800000                                     # default: 30 minutes
    auto: false                                             # default: false (set true to opt in)
```

## Install

```sh
dsh plugin --profile desktop add /absolute/path/to/dsh-skill-sync
```

## Test

```sh
node test/smoke.mjs            # wrapper: registers command, relays script output
node test/sync-script.test.mjs # script: pull + symlink reconcile against a temp remote
```
