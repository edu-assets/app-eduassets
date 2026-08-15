import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'index.html'];
const EXTENSIONS = new Set(['.ts', '.html']);

const KNOWN_DYNAMIC_ICONS = [
    'laptop', 'tablet', 'headphones', 'bolt', 'usb', 'devices_other',
    'chat_bubble', 'build', 'heart_broken', 'task_alt',
    'monitor', 'battery_alert', 'cable', 'touch_app', 'keyboard',
    'smart_button', 'construction', 'help',
];

function collectFiles(path, acc = []) {
    const stat = statSync(path);
    if (stat.isDirectory()) {
        for (const entry of readdirSync(path)) {
            if (entry === 'node_modules' || entry === 'dist') continue;
            collectFiles(join(path, entry), acc);
        }
    } else if (EXTENSIONS.has(extname(path))) {
        acc.push(path);
    }
    return acc;
}

function extractFromFile(content) {
    const found = new Set();

    const spanRegex = /class="material-symbols-outlined[^"]*"[^>]*>\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*</g;
    let m;
    while ((m = spanRegex.exec(content))) found.add(m[1]);

    const iconKeyRegex = /icon:\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]/g;
    while ((m = iconKeyRegex.exec(content))) found.add(m[1]);

    return found;
}

const files = [];
for (const entry of SCAN_DIRS) {
    collectFiles(join(ROOT, entry), files);
}

const allIcons = new Set(KNOWN_DYNAMIC_ICONS);
for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const icon of extractFromFile(content)) allIcons.add(icon);
}

const sorted = [...allIcons].sort();
writeFileSync(join(ROOT, 'icons.txt'), sorted.join('\n') + '\n', 'utf8');

console.log(`Encontrados ${sorted.length} ícones únicos em ${files.length} arquivos.`);
console.log(`Lista salva em: ${join(ROOT, 'icons.txt')}`);
console.log('');
console.log('IMPORTANTE: revise o icons.txt manualmente antes de gerar o subset.');
console.log('Se algum ícone usado dinamicamente (variável de mapeamento) não');
console.log('constar aqui, adicione-o à mão (uma linha por ícone) ou inclua');
console.log('no array KNOWN_DYNAMIC_ICONS deste script.');
