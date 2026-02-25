import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Path to the instructions folder (src/instructions/).
 */
const INSTRUCTIONS_DIR = join(__dirname, '..', 'instructions');

/**
 * Load a single instruction file by name (without extension).
 * @param {string} name - e.g. 'system'
 * @returns {string|null} The file contents, or null if not found.
 */
export function loadInstruction(name) {
    const filePath = join(INSTRUCTIONS_DIR, `${name}.md`);
    if (!existsSync(filePath)) return null;

    try {
        return readFileSync(filePath, 'utf-8').trim();
    } catch {
        return null;
    }
}

/**
 * Load and concatenate all .md instruction files from src/instructions/.
 * Files are sorted alphabetically so the order is deterministic.
 * @returns {string} Combined instruction text, or empty string if none found.
 */
export function loadAllInstructions() {
    if (!existsSync(INSTRUCTIONS_DIR)) return '';

    try {
        const files = readdirSync(INSTRUCTIONS_DIR)
            .filter(f => f.endsWith('.md'))
            .sort();

        if (files.length === 0) return '';

        const sections = [];
        for (const file of files) {
            const content = readFileSync(join(INSTRUCTIONS_DIR, file), 'utf-8').trim();
            if (content) sections.push(content);
        }

        return sections.join('\n\n');
    } catch {
        return '';
    }
}
