import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';

// Binary / non-text extensions to skip
const BINARY_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.webm',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.db', '.sqlite', '.sqlite3',
    '.lock',
]);

// Max size per file when reading (8 KB)
const MAX_FILE_SIZE = 8 * 1024;

/**
 * Check if a filename is an env file that should always be excluded.
 */
function isEnvFile(name) {
    const lower = name.toLowerCase();
    return lower === '.env' || lower.startsWith('.env.');
}

/**
 * Check if a file looks binary based on extension.
 */
function isBinary(filepath) {
    const ext = filepath.substring(filepath.lastIndexOf('.')).toLowerCase();
    return BINARY_EXT.has(ext);
}

/**
 * Get the list of valid project file paths from cwd.
 * Uses git ls-files (respects .gitignore). Falls back to manual walk.
 * Always excludes .env* files and binary files.
 *
 * @param {string} rootDir - The root directory to scan (locked boundary)
 * @returns {string[]} Array of relative file paths
 */
export function listProjectFiles(rootDir) {
    const absRoot = resolve(rootDir);
    let filePaths = [];

    try {
        const output = execSync('git ls-files --cached --others --exclude-standard', {
            cwd: absRoot,
            encoding: 'utf-8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        filePaths = output
            .split('\n')
            .map(f => f.trim())
            .filter(Boolean);
    } catch {
        filePaths = walkDirectory(absRoot, absRoot);
    }

    // Filter out env files, binary files, node_modules
    return filePaths.filter(relPath => {
        const absPath = resolve(absRoot, relPath);
        if (!absPath.startsWith(absRoot)) return false;

        const fileName = relPath.split('/').pop();
        if (isEnvFile(fileName)) return false;
        if (isBinary(relPath)) return false;
        if (relPath.includes('node_modules/')) return false;

        return true;
    });
}

/**
 * Read a single project file safely (locked to rootDir and below).
 *
 * @param {string} rootDir - The root directory (security boundary)
 * @param {string} filePath - Relative path to the file
 * @returns {string} File contents or an error message
 */
export function readProjectFile(rootDir, filePath) {
    const absRoot = resolve(rootDir);
    const absPath = resolve(absRoot, filePath);

    // Security: no escaping above root
    if (!absPath.startsWith(absRoot)) {
        return '[Error: Access denied — path is outside the project directory]';
    }

    // Block .env files
    const fileName = filePath.split('/').pop();
    if (isEnvFile(fileName)) {
        return '[Error: Access denied — .env files are restricted]';
    }

    try {
        const stat = statSync(absPath);
        if (!stat.isFile()) return '[Error: Not a file]';
        if (stat.size > MAX_FILE_SIZE) {
            // Read just the first chunk
            const content = readFileSync(absPath, 'utf-8').substring(0, MAX_FILE_SIZE);
            return content + '\n\n[... file truncated at 8 KB ...]';
        }
        return readFileSync(absPath, 'utf-8');
    } catch (err) {
        return `[Error: ${err.message}]`;
    }
}


// ─── Manual directory walk (fallback when git is unavailable) ──────

function walkDirectory(dir, rootDir, depth = 0) {
    if (depth > 10) return [];

    const results = [];
    const ignorePatterns = loadGitignore(rootDir);

    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git' || entry === '.wwebjs_cache') continue;

        const fullPath = join(dir, entry);
        const relPath = relative(rootDir, fullPath);

        try {
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                if (!isIgnored(relPath + '/', ignorePatterns)) {
                    results.push(...walkDirectory(fullPath, rootDir, depth + 1));
                }
            } else if (stat.isFile()) {
                if (!isIgnored(relPath, ignorePatterns)) {
                    results.push(relPath);
                }
            }
        } catch {
            // Skip
        }
    }

    return results;
}

function loadGitignore(rootDir) {
    const gitignorePath = join(rootDir, '.gitignore');
    if (!existsSync(gitignorePath)) return [];

    try {
        const content = readFileSync(gitignorePath, 'utf-8');
        return content
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
    } catch {
        return [];
    }
}

function isIgnored(relPath, patterns) {
    for (const pattern of patterns) {
        if (pattern.endsWith('/')) {
            const dirPattern = pattern.slice(0, -1);
            if (relPath.startsWith(dirPattern + '/') || relPath === dirPattern) return true;
        } else if (pattern.includes('*')) {
            const regex = new RegExp(
                '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
            );
            if (regex.test(relPath) || regex.test(relPath.split('/').pop())) return true;
        } else {
            if (relPath === pattern || relPath.split('/').pop() === pattern) return true;
        }
    }
    return false;
}
