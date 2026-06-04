/*******************************************************************************
 * Copyright (c) 2025-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

/**
 * Regression guard for the case-sensitivity packaging bug: on a case-insensitive
 * filesystem (e.g. macOS) `tsc` can leave a stale, differently-cased dist/*.js next to
 * camelCase import specifiers, which still resolves locally but breaks on case-sensitive
 * filesystems (Linux/Docker) with ERR_MODULE_NOT_FOUND.
 *
 * We verify case-sensitively by matching every relative import specifier against the
 * actual directory listing — `existsSync` would falsely pass on macOS.
 */
test('every relative import in dist resolves with exact case', () => {
    const present = new Set(readdirSync(distDir));
    const jsFiles = [...present].filter((f) => f.endsWith('.js'));
    assert.ok(jsFiles.length > 0, 'dist must be built before running tests (npm test runs build first)');

    const specRe = /(?:from|import\s*\()\s*['"](\.[^'"]+\.js)['"]/g;
    const broken = [];
    for (const file of jsFiles) {
        const src = readFileSync(join(distDir, file), 'utf8');
        for (const m of src.matchAll(specRe)) {
            const target = basename(m[1]); // dist is flat
            if (!present.has(target)) broken.push(`${file} -> ${m[1]}`);
        }
    }
    assert.deepEqual(broken, [], `case-mismatched / unresolved relative imports in dist:\n${broken.join('\n')}`);
});
