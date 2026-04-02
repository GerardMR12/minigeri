import { spawn } from 'child_process';
import chalk from 'chalk';

/**
 * Execute a CLI-based AI agent with the given prompt.
 * Streams stdout/stderr in real-time.
 *
 * @param {string} command - The CLI command (e.g. 'claude', 'gemini')
 * @param {string[]} args - Arguments to pass
 * @param {object} options - Spawn options
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
export function execAgent(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const stdout = [];
        const stderr = [];
        const silent = options.silent || false;

        // On Windows, spawn with shell:true joins args with spaces but does not
        // quote them, so args containing spaces get split by the shell.
        const spawnArgs = process.platform === 'win32'
            ? args.map(a => (typeof a === 'string' && a.includes(' ')) ? `"${a}"` : a)
            : args;

        const proc = spawn(command, spawnArgs, {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: process.platform === 'win32',

            ...options,
        });

        proc.stdout.on('data', (data) => {
            const text = data.toString();
            stdout.push(text);
            if (!silent) process.stdout.write(text);
        });

        proc.stderr.on('data', (data) => {
            const text = data.toString();
            stderr.push(text);
            if (!silent) process.stderr.write(chalk.dim(text));
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start "${command}": ${err.message}`));
        });

        proc.on('close', (code) => {
            resolve({
                code,
                stdout: stdout.join(''),
                stderr: stderr.join(''),
            });
        });
    });
}

/**
 * Execute a CLI agent in fully interactive mode (passthrough stdio).
 */
export function execInteractive(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: 'inherit',
            shell: process.platform === 'win32',

            ...options,
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start "${command}": ${err.message}`));
        });

        proc.on('close', (code) => {
            resolve({ code });
        });
    });
}

/**
 * Send a single prompt to a CLI agent and capture the output.
 * Uses the --print / -p flag pattern common to Claude Code and Gemini CLI.
 */
export async function sendPrompt(command, prompt, flags = []) {
    // Claude Code: claude -p "prompt"
    // Gemini CLI: gemini -p "prompt" (hypothetical)
    const args = [...flags, prompt];
    return execAgent(command, args);
}
