// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../core/utils/sanitize.js';
import { sanitizeHtml } from '../core/docs/sanitize.js';
import { renderizarMarkdown } from '../core/docs/markdownRenderer.js';

describe('escapeHtml', () => {
    it('escapes the five dangerous characters', () => {
        expect(escapeHtml(`<script>alert('xss')</script> & "quotes"`))
            .toBe('&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt; &amp; &quot;quotes&quot;');
    });

    it('returns an empty string for null and undefined', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('converts numbers and other types to strings before escaping', () => {
        expect(escapeHtml(42)).toBe('42');
        expect(escapeHtml(true)).toBe('true');
    });

    it('does not change plain text', () => {
        expect(escapeHtml('Notebook Multilaser')).toBe('Notebook Multilaser');
    });
});

describe('documentation HTML sanitizer', () => {
    it.each([
        ['java&#10;script:alert(1)', 'line-feed obfuscated javascript'],
        ['jav&#9;ascript:alert(1)', 'tab-obfuscated javascript'],
        ['data:text/html,<script>alert(1)</script>', 'data URL'],
        ['vbscript:alert(1)', 'VBScript URL']
    ])('removes href for %s (%s)', (href) => {
        const output = sanitizeHtml(`<a href="${href}">unsafe</a>`);
        const template = document.createElement('template');
        template.innerHTML = output;
        expect(template.content.querySelector('a')?.hasAttribute('href')).toBe(false);
    });

    it('keeps safe web, mail, fragment, and same-origin relative links', () => {
        const output = sanitizeHtml([
            '<a href="https://example.com/guide">web</a>',
            '<a href="mailto:help@example.com">mail</a>',
            '<a href="#section">fragment</a>',
            '<a href="../guide">relative</a>'
        ].join(''));
        const template = document.createElement('template');
        template.innerHTML = output;
        const links = [...template.content.querySelectorAll('a')];
        expect(links).toHaveLength(4);
        expect(links.every((link) => link.hasAttribute('href'))).toBe(true);
        expect(links.every((link) => link.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
    });

    it('rejects remote images and source-supplied ids but preserves local images', () => {
        const output = sanitizeHtml([
            '<h2 id="attacker-anchor">Heading</h2>',
            '<img src="https://tracker.example/pixel.png" alt="remote">',
            '<img src="/docs/local.png" alt="local" id="raw-image-id">'
        ].join(''));
        const template = document.createElement('template');
        template.innerHTML = output;
        expect(template.content.querySelector('h2')?.hasAttribute('id')).toBe(false);
        expect(template.content.querySelector('img[src^="https://"]')).toBeNull();
        expect(template.content.querySelector('img[src="/docs/local.png"]')?.hasAttribute('id')).toBe(false);
    });

    it('preserves supported Markdown constructs and generates heading ids after sanitizing', async () => {
        const markdown = [
            '# User guide',
            '',
            '## Section One',
            '',
            'A **bold** paragraph and a [safe link](https://example.com/guide).',
            '',
            '> [!NOTE]  ',
            '> A callout remains readable.',
            '',
            '| Field | Value |',
            '| --- | --- |',
            '| status | supported |',
            '',
            '```ts',
            'const value = 1;',
            '```'
        ].join('\n');
        const rendered = await renderizarMarkdown(markdown);
        expect(rendered.html).toContain('<h1>User guide</h1>');
        expect(rendered.html).toContain('<strong>bold</strong>');
        expect(rendered.html).toContain('href="https://example.com/guide"');
        expect(rendered.html).toContain('data-callout="note"');
        expect(rendered.html).toContain('doc-table-wrap');
        expect(rendered.html).toContain('doc-code-copy-btn');
        expect(rendered.headings).toEqual([{ id: 'section-one', nivel: 2, texto: 'Section One' }]);
        expect(rendered.html).toContain('id="section-one"');
    });
});
