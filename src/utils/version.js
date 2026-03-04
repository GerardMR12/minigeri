import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

/**
 * Checks if there's a new version available via git.
 * @returns {Promise<{available: boolean, current: string, latest?: string, error?: string}>}
 */
export async function checkForUpdates() {
    if (!existsSync(join(rootDir, '.git'))) {
        return { available: false, error: 'Not a git repository' };
    }

    try {
        const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
        const currentVersion = pkg.version;

        // Check if origin exists
        const hasOrigin = await new Promise((resolve) => {
            const proc = spawn('git', ['remote'], { cwd: rootDir });
            let output = '';
            proc.stdout.on('data', (data) => { output += data; });
            proc.on('close', (code) => {
                resolve(code === 0 && output.includes('origin'));
            });
        });

        if (!hasOrigin) {
            return { available: false, error: 'No origin remote configured' };
        }

        // Run git fetch in the background to avoid blocking for too long, 
        // but we'll wait for it here as we want to know now.
        await new Promise((resolve, reject) => {
            const proc = spawn('git', ['fetch', 'origin', 'main'], {
                cwd: rootDir,
                stdio: 'ignore'
            });
            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`git fetch failed with code ${code}`));
            });
            proc.on('error', reject);
            
            // Timeout after 2 seconds to avoid blocking startup too long
            setTimeout(() => {
                proc.kill();
                reject(new Error('Timeout fetching updates'));
            }, 2000);
        });

        const behindCount = await new Promise((resolve, reject) => {
            const proc = spawn('git', ['rev-list', '--count', 'HEAD..origin/main'], {
                cwd: rootDir
            });
            let output = '';
            proc.stdout.on('data', (data) => { output += data; });
            proc.on('close', (code) => {
                if (code === 0) resolve(parseInt(output.trim(), 10));
                else reject(new Error(`git rev-list failed with code ${code}`));
            });
            proc.on('error', reject);
        });

        if (behindCount > 0) {
            return {
                available: true,
                current: currentVersion,
                behindCount
            };
        }

        return { available: false, current: currentVersion };
    } catch (err) {
        return { available: false, error: err.message };
    }
}
