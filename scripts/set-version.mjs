#!/usr/bin/env node
/**
 * Single command to set (or verify) the eduAssets product version across the sibling repositories.
 * The canonical version is the "version" field of app/package.json.
 *
 *   npm run version:set -- <x.y.z> [--date YYYY-MM-DD]   set the version everywhere
 *   npm run version:set -- --check                       exit 1 when any location disagrees with app/package.json
 *
 * Updated (only the version/status text, never changelogs or history):
 *   app   package.json + package-lock.json ("version" and packages[""].version), README.md / README_PT.md status line
 *   api   package.json + package-lock.json, README.md / README_PT.md status line      (../api)
 *   docs  README.md ("released YYYY-MM-DD") / README_PT.md ("publicada em DD/MM/YYYY") (../docs)
 *   site  package.json + package-lock.json, README.md "Release status" line           (../site)
 *         The landing page reads site/package.json at build time, so nothing else is edited there.
 *
 * --date defaults to today (local time). When the docs already carry the requested version and --date is
 * omitted, their release date is kept, so re-running the command never moves a published date.
 * A missing sibling folder or file only warns. A status line that no longer matches its pattern fails the run
 * before anything is written. Re-running with the same arguments changes nothing (idempotent).
 * Not touched on purpose: app/src/core/docs/registry.ts (per-document versions, managed by `npm run docs:sync`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = resolve(appDir, '..');

const SEMVER = '\\d+\\.\\d+\\.\\d+';

/** package.json: the top-level key (2-space indent) comes before any dependency block. */
const PACKAGE_VERSION = {
    name: 'package.json version',
    re: new RegExp(`(?<pre>^  "version":\\s*")(?<ver>${SEMVER})(?<post>")`, 'm')
};
/** package-lock.json: the root package entry packages[""] (the top-level "version" is covered by PACKAGE_VERSION). */
const LOCK_ROOT_VERSION = {
    name: 'package-lock packages[""].version',
    re: new RegExp(`(?<pre>"packages":\\s*\\{\\s*"":\\s*\\{[^}]*?\\n\\s{6}"version":\\s*")(?<ver>${SEMVER})(?<post>")`)
};

const readmeStatus = (name, prefix, suffix) => ({
    name,
    re: new RegExp(`(?<pre>${prefix})(?<ver>${SEMVER})(?<post>${suffix})`)
});

const ISO = '\\d{4}-\\d{2}-\\d{2}';
const BR = '\\d{2}/\\d{2}/\\d{4}';

/** Every location, per repository. `dir` is relative to the workspace root. */
const REPOS = [
    {
        repo: 'app',
        dir: 'app',
        files: [
            { file: 'package.json', patterns: [PACKAGE_VERSION] },
            { file: 'package-lock.json', patterns: [PACKAGE_VERSION, LOCK_ROOT_VERSION] },
            { file: 'README.md', patterns: [readmeStatus('README status line', '\\*\\*Status: Official version ', '\\.\\*\\*')] },
            { file: 'README_PT.md', patterns: [readmeStatus('README_PT status line', '\\*\\*Status: Versão oficial ', '\\.\\*\\*')] }
        ]
    },
    {
        repo: 'api',
        dir: 'api',
        files: [
            { file: 'package.json', patterns: [PACKAGE_VERSION] },
            { file: 'package-lock.json', patterns: [PACKAGE_VERSION, LOCK_ROOT_VERSION] },
            { file: 'README.md', patterns: [readmeStatus('README status line', '\\*\\*Status: Official version ', '\\.\\*\\*')] },
            { file: 'README_PT.md', patterns: [readmeStatus('README_PT status line', '\\*\\*Status: Versão oficial ', '\\.\\*\\*')] }
        ]
    },
    {
        repo: 'docs',
        dir: 'docs',
        files: [
            {
                file: 'README.md',
                patterns: [{
                    name: 'README product status (version + release date)',
                    re: new RegExp(`(?<pre>\\*\\*Product status:\\*\\* official version )(?<ver>${SEMVER})(?<mid>, released )(?<date>${ISO})(?<post>)`),
                    dateFormat: 'iso'
                }]
            },
            {
                file: 'README_PT.md',
                patterns: [{
                    name: 'README_PT status do produto (versão + data)',
                    re: new RegExp(`(?<pre>\\*\\*Status do produto:\\*\\* versão oficial )(?<ver>${SEMVER})(?<mid>, publicada em )(?<date>${BR})(?<post>)`),
                    dateFormat: 'br'
                }]
            }
        ]
    },
    {
        repo: 'site',
        dir: 'site',
        files: [
            { file: 'package.json', patterns: [PACKAGE_VERSION] },
            { file: 'package-lock.json', patterns: [PACKAGE_VERSION, LOCK_ROOT_VERSION] },
            { file: 'README.md', patterns: [readmeStatus('README release status', '\\*\\*Release status:\\*\\* official version ', '\\.')] }
        ]
    }
];

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function parseArgs(argv) {
    const opcoes = { version: null, date: null, check: false };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--check') opcoes.check = true;
        else if (arg === '--date') opcoes.date = argv[++i] ?? fail('--date needs a value (YYYY-MM-DD)');
        else if (arg.startsWith('--date=')) opcoes.date = arg.slice('--date='.length);
        else if (arg.startsWith('-')) fail(`unknown option ${arg}`);
        else if (opcoes.version === null) opcoes.version = arg;
        else fail(`unexpected argument ${arg}`);
    }
    if (opcoes.check) {
        if (opcoes.version || opcoes.date) fail('--check takes no version or date: it compares against app/package.json');
        return opcoes;
    }
    if (!opcoes.version) fail('usage: npm run version:set -- <x.y.z> [--date YYYY-MM-DD]   |   npm run version:set -- --check');
    if (!new RegExp(`^${SEMVER}$`).test(opcoes.version)) fail(`"${opcoes.version}" is not a valid x.y.z version`);
    if (opcoes.date !== null) {
        const valida = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opcoes.date);
        const data = valida && new Date(Date.UTC(+valida[1], +valida[2] - 1, +valida[3]));
        if (!data || data.toISOString().slice(0, 10) !== opcoes.date) fail(`"${opcoes.date}" is not a valid YYYY-MM-DD date`);
    }
    return opcoes;
}

function hojeLocal() {
    const agora = new Date();
    const dois = (n) => String(n).padStart(2, '0');
    return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

const isoParaBr = (iso) => iso.split('-').reverse().join('/');
const brParaIso = (br) => br.split('/').reverse().join('-');
const formatarData = (iso, formato) => (formato === 'br' ? isoParaBr(iso) : iso);
const dataParaIso = (valor, formato) => (formato === 'br' ? brParaIso(valor) : valor);

const caminhoRelativo = (arquivo) => relative(rootDir, arquivo).replaceAll('\\', '/');

function lerVersaoCanonica() {
    const bruto = JSON.parse(readFileSync(resolve(appDir, 'package.json'), 'utf8'));
    if (!new RegExp(`^${SEMVER}$`).test(bruto.version ?? '')) fail('app/package.json has no valid "version"');
    return bruto.version;
}

/** Reads every expected location. Returns { entries, warnings, errors }. */
function coletar() {
    const entries = [];
    const warnings = [];
    const errors = [];
    for (const repo of REPOS) {
        const dir = resolve(rootDir, repo.dir);
        if (!existsSync(dir)) {
            if (repo.repo === 'app') errors.push('app folder not found');
            else warnings.push(`sibling folder ../${repo.dir} not found: skipped`);
            continue;
        }
        for (const alvo of repo.files) {
            const arquivo = resolve(dir, alvo.file);
            if (!existsSync(arquivo)) {
                warnings.push(`${caminhoRelativo(arquivo)} not found: skipped`);
                continue;
            }
            const texto = readFileSync(arquivo, 'utf8');
            const encontrados = [];
            for (const padrao of alvo.patterns) {
                const m = padrao.re.exec(texto);
                if (!m) {
                    errors.push(`${caminhoRelativo(arquivo)}: expected pattern not found (${padrao.name})`);
                    continue;
                }
                encontrados.push({ padrao, versao: m.groups.ver, data: m.groups.date ?? null });
            }
            entries.push({ arquivo, texto, alvo, encontrados });
        }
    }
    return { entries, warnings, errors };
}

function reescrever(texto, padrao, versao, dataIso) {
    return texto.replace(padrao.re, (...args) => {
        const g = args[args.length - 1];
        const data = g.date === undefined ? '' : formatarData(dataIso, padrao.dateFormat);
        return `${g.pre}${versao}${g.mid ?? ''}${data}${g.post ?? ''}`;
    });
}

function verificar(canonica) {
    const { entries, warnings, errors } = coletar();
    warnings.forEach((aviso) => console.warn(`warning: ${aviso}`));
    const divergencias = [];
    for (const entry of entries) {
        for (const { padrao, versao } of entry.encontrados) {
            const ok = versao === canonica;
            console.log(`${ok ? 'ok      ' : 'MISMATCH'} ${caminhoRelativo(entry.arquivo)} [${padrao.name}] ${versao}`);
            if (!ok) divergencias.push(`${caminhoRelativo(entry.arquivo)} has ${versao}, expected ${canonica}`);
        }
    }
    // The docs README pair must announce the same release date in both languages.
    const datas = entries.flatMap((entry) => entry.encontrados
        .filter((item) => item.data)
        .map((item) => ({ arquivo: caminhoRelativo(entry.arquivo), iso: dataParaIso(item.data, item.padrao.dateFormat) })));
    if (new Set(datas.map((item) => item.iso)).size > 1) {
        divergencias.push(`release dates differ: ${datas.map((item) => `${item.arquivo}=${item.iso}`).join(', ')}`);
    }
    errors.forEach((erro) => console.error(`error: ${erro}`));
    if (errors.length || divergencias.length) {
        divergencias.forEach((d) => console.error(`error: ${d}`));
        console.error(`version check failed (canonical version ${canonica} from app/package.json)`);
        process.exit(1);
    }
    console.log(`version check passed: every location is ${canonica}`);
}

function definir(versao, dataPedida) {
    const { entries, warnings, errors } = coletar();
    warnings.forEach((aviso) => console.warn(`warning: ${aviso}`));
    if (errors.length) {
        errors.forEach((erro) => console.error(`error: ${erro}`));
        fail('nothing was written');
    }

    // Keep a published release date when the docs already announce this version and no --date was given.
    const datasAtuais = entries.flatMap((entry) => entry.encontrados
        .filter((item) => item.data && item.versao === versao)
        .map((item) => dataParaIso(item.data, item.padrao.dateFormat)));
    const dataIso = dataPedida ?? (datasAtuais.length > 0 && new Set(datasAtuais).size === 1 ? datasAtuais[0] : hojeLocal());

    const alterados = [];
    for (const entry of entries) {
        let novo = entry.texto;
        for (const { padrao } of entry.encontrados) novo = reescrever(novo, padrao, versao, dataIso);
        if (novo !== entry.texto) {
            alterados.push({ arquivo: entry.arquivo, novo });
            continue;
        }
        console.log(`unchanged ${caminhoRelativo(entry.arquivo)}`);
    }
    for (const item of alterados) {
        writeFileSync(item.arquivo, item.novo);
        console.log(`updated   ${caminhoRelativo(item.arquivo)}`);
    }
    console.log(`\nversion ${versao} (release date ${dataIso}): ${alterados.length} file(s) updated.`);
    if (alterados.length) console.log('Run `npm run version:set -- --check` to confirm and `npm run docs:sync` if the documents changed.');
}

const opcoes = parseArgs(process.argv.slice(2));
if (opcoes.check) verificar(lerVersaoCanonica());
else definir(opcoes.version, opcoes.date);
