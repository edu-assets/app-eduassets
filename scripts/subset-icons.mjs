import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const ROOT = process.cwd();

const SOURCE_FONT = join(ROOT, '/assets/fonts/material-symbols-outlined.woff2');
const ICONS_FILE = join(ROOT, 'icons.txt');
const OUTPUT_FONT = join(ROOT, '/assets/fonts/material-symbols-outlined.woff2');

async function main() {
    if (!existsSync(SOURCE_FONT)) {
        console.error(`Fonte de origem não encontrada em: ${SOURCE_FONT}`);
        console.error('Ajuste a constante SOURCE_FONT no script.');
        process.exit(1);
    }
    if (!existsSync(ICONS_FILE)) {
        console.error(`icons.txt não encontrado em: ${ICONS_FILE}`);
        console.error('Rode antes: node scripts/extract-icons.mjs');
        process.exit(1);
    }

    const icons = readFileSync(ICONS_FILE, 'utf8')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

    if (icons.length === 0) {
        console.error('icons.txt está vazio.');
        process.exit(1);
    }

    console.log(`Subsetando ${icons.length} ícones...`);

    const originalBuffer = readFileSync(SOURCE_FONT);
    const originalSize = originalBuffer.length;

    const text = icons.join(' ');

    const subsetBuffer = await subsetFont(originalBuffer, text, {
        targetFormat: 'woff2',
        variationAxes: {
            wght: 400,
            opsz: 24,
            GRAD: 0,
        },
    });

    writeFileSync(OUTPUT_FONT, subsetBuffer);

    const newSize = subsetBuffer.length;
    const reduction = (100 - (newSize / originalSize) * 100).toFixed(1);

    console.log('');
    console.log(`Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Subset:   ${(newSize / 1024).toFixed(1)} KB`);
    console.log(`Redução:  ${reduction}%`);
    console.log(`Salvo em: ${OUTPUT_FONT}`);
    console.log('');
    console.log('Confira visualmente todos os painéis do app antes de commitar —');
    console.log('se algum ícone sumir/virar um quadrado, falta esse nome no icons.txt.');
}

main().catch((err) => {
    console.error('Erro ao gerar o subset:', err);
    process.exit(1);
});
