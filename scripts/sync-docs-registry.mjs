#!/usr/bin/env node
// Keeps the documentation catalog metadata (src/core/docs/registry.ts) in sync with the docs repository.
//
// For every registry entry, `updatedAt` must equal the date of the last commit that touched either of its
// Markdown files (pt/en) in docs-eduassets, at the commit pinned in src/core/docs/docsService.ts.
//
//   node scripts/sync-docs-registry.mjs            # after updating the pin: fix dates; documents changed since the
//                                                  # previous pin get the current package version
//   node scripts/sync-docs-registry.mjs --check    # CI: exit 1 when a date is out of date
//
// Options: --docs <path to a docs-eduassets clone with full history> (default ../docs-eduassets)
//          --ref <commit> (default: the SHA pinned in docsService.ts)
//          --since <commit> (sync mode; default: the pin in the last committed docsService.ts)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const REGISTRY = resolve(ROOT, 'src/core/docs/registry.ts');
const DOCS_SERVICE = resolve(ROOT, 'src/core/docs/docsService.ts');

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const check = args.includes('--check');
const docsRepo = resolve(ROOT, option('--docs', '../docs-eduassets'));

const pinned = readFileSync(DOCS_SERVICE, 'utf8').match(/docs-eduassets\/([0-9a-f]{40})\/public/)?.[1];
const ref = option('--ref', pinned);
if (!ref) {
    console.error('Could not find the pinned docs commit in docsService.ts; pass --ref.');
    process.exit(2);
}

const git = (...gitArgs) => execFileSync('git', ['-C', docsRepo, ...gitArgs], { encoding: 'utf8' }).trim();
try {
    git('cat-file', '-e', `${ref}^{commit}`);
} catch {
    console.error(`Commit ${ref} not found in ${docsRepo}. Fetch the docs repository with full history.`);
    process.exit(2);
}

const version = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;
const raw = readFileSync(REGISTRY, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let source = raw.replace(/\r\n/g, '\n');

// Each entry: id, file: { pt, en }, version, updatedAt (in that order, as written in registry.ts).
const entryPattern = /id: '([^']+)',[\s\S]*?file: \{ pt: '([^']+)', en: '([^']+)' \},[\s\S]*?version: '([^']+)',\s*updatedAt: '([^']+)'/g;
const entries = [...source.matchAll(entryPattern)];
if (!entries.length) {
    console.error('No registry entries found; the registry format may have changed.');
    process.exit(2);
}

// Sync mode also needs the previously pinned docs commit (from the last committed docsService.ts, or --since):
// a document whose files changed between that commit and the new pin gets the current package version, even when
// its date does not change (two releases on the same day).
let since = null;
if (!check) {
    since = option('--since', null);
    if (!since) {
        try {
            const committed = execFileSync('git', ['show', 'HEAD:src/core/docs/docsService.ts'], { encoding: 'utf8' });
            since = committed.match(/docs-eduassets\/([0-9a-f]{40})\/public/)?.[1] ?? null;
        } catch {
            since = null;
        }
    }
    if (since === ref) since = null;
    if (since) {
        try {
            git('cat-file', '-e', `${since}^{commit}`);
        } catch {
            console.error(`Previous docs commit ${since} not found in ${docsRepo}; pass --since.`);
            process.exit(2);
        }
    }
}

const problems = [];
for (const [, id, pt, en, currentVersion, currentDate] of entries) {
    const paths = [pt, en].map((file) => `public${file}`);
    const lastChange = git('log', '-1', '--format=%cs', ref, '--', ...paths);
    if (!lastChange) {
        problems.push(`${id}: no commit found for ${paths.join(', ')}`);
        continue;
    }
    const changedSincePin = since !== null && git('diff', '--name-only', since, ref, '--', ...paths) !== '';
    const newVersion = changedSincePin ? version : currentVersion;
    if (lastChange === currentDate && newVersion === currentVersion) continue;

    problems.push(`${id}: updatedAt ${currentDate} -> ${lastChange}` + (check ? '' : `, version ${currentVersion} -> ${newVersion}`));
    if (!check) {
        const block = new RegExp(`(id: '${id}',[\\s\\S]*?version: ')[^']+(',\\s*updatedAt: ')[^']+'`);
        source = source.replace(block, `$1${newVersion}$2${lastChange}'`);
    }
}

if (!problems.length) {
    console.log(`Docs registry is in sync with docs-eduassets@${ref.slice(0, 7)} (${entries.length} entries).`);
    process.exit(0);
}

console.log(problems.map((p) => `  - ${p}`).join('\n'));
if (check) {
    console.error('Docs registry is out of date. Run: node scripts/sync-docs-registry.mjs --docs <docs-eduassets clone>');
    process.exit(1);
}
writeFileSync(REGISTRY, source.replace(/\n/g, eol));
console.log(`Updated ${problems.length} registry entr${problems.length === 1 ? 'y' : 'ies'}.`);
