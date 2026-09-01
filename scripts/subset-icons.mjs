import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const ROOT = process.cwd();

const FONT_DIR = join(ROOT, '/assets/fonts');
const SOURCE_FONT = join(FONT_DIR, 'material-symbols-outlined.full.woff2');
const ICONS_FILE = join(ROOT, 'icons.txt');
const OUTPUT_FONT = join(FONT_DIR, 'material-symbols-outlined.woff2');

async function main() {
    if (!existsSync(SOURCE_FONT)) {
        console.error(`Fonte de origem (completa) não encontrada em: ${SOURCE_FONT}`);
        console.error('Esta deve ser a fonte COMPLETA, nunca sobrescrita pelo subset.');
        console.error('Baixe a fonte original do Google Fonts e salve-a nesse caminho antes de rodar o script.');
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

    // Backup de segurança do output anterior.
    if (existsSync(OUTPUT_FONT)) {
        copyFileSync(OUTPUT_FONT, `${OUTPUT_FONT}.bak`);
    }

    writeFileSync(OUTPUT_FONT, subsetBuffer);

    const newSize = subsetBuffer.length;
    const reduction = (100 - (newSize / originalSize) * 100).toFixed(1);

    console.log('');
    console.log(`Original (fonte completa, preservada): ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Subset gerado:                          ${(newSize / 1024).toFixed(1)} KB`);
    console.log(`Redução:                                ${reduction}%`);
    console.log(`Fonte completa em: ${SOURCE_FONT} (nunca é sobrescrita)`);
    console.log(`Salvo em:          ${OUTPUT_FONT}`);
    console.log(`Backup do subset anterior: ${OUTPUT_FONT}.bak`);
    console.log('');
    console.log('Confira visualmente todos os painéis do app antes de commitar —');
    console.log('se algum ícone sumir/virar um quadrado, falta esse nome no icons.txt.');
}

main().catch((err) => {
    console.error('Erro ao gerar o subset:', err);
    process.exit(1);
});