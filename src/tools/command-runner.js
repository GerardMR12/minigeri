/**
 * ─── Command Runner ───────────────────────────────────────────────
 *
 * Executes minigeri commands programmatically and captures their
 * console output as a string. This allows AI agents to call any
 * existing command (e.g. "folder", "status", "slack channels")
 * and receive the result as text.
 *
 * Design:
 *   • Validates commands against an explicit allowlist before execution
 *   • Temporarily intercepts stdout/stderr writes to capture output
 *   • Delegates to the same handler functions used by the shell
 *   • Returns the captured text so agents can reason about it
 */

// ── Security: allowed commands ──────────────────────────────────
// Only commands in this set can be executed by AI agents.
// Add new entries here when registering new commands.

const ALLOWED_COMMANDS = new Set([
    'claude',
    'gemini',
    'groq',
    'ollama',
    'wa',
    'slack',
    'tg',
    'ngrok',
    'folder',
    'status',
    'theme',
    'cd',
]);

// ── Command registry ────────────────────────────────────────────
// Handler functions are registered here by minigeri.js at startup.
// This avoids circular imports — the runner doesn't import minigeri.

const registry = {};

/**
 * Register a command handler so it can be invoked via runCommand().
 *
 * @param {string} name - Command name (e.g. 'folder', 'status', 'wa')
 * @param {Function} handler - async function(args: string[]) => void
 */
export function registerCommand(name, handler) {
    registry[name.toLowerCase()] = handler;
}

/**
 * List all registered command names that are also allowed.
 * @returns {string[]}
 */
export function listRegisteredCommands() {
    return Object.keys(registry)
        .filter(cmd => ALLOWED_COMMANDS.has(cmd))
        .sort();
}

/**
 * Execute a minigeri command by name and capture its console output.
 * The command must be in the ALLOWED_COMMANDS set — any unrecognized
 * or disallowed command is rejected before execution.
 *
 * @param {string} commandString - Full command string (e.g. "folder", "slack channels")
 * @returns {Promise<string>} The captured text output
 */
export async function runCommand(commandString) {
    const trimmed = (commandString || '').trim();
    if (!trimmed) return '[Error: empty command]';

    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = name.toLowerCase();

    // ── Security check ──────────────────────────────────────────
    if (!ALLOWED_COMMANDS.has(cmd)) {
        const allowed = [...ALLOWED_COMMANDS].sort().join(', ');
        return `[Error: command "${cmd}" is not allowed. Permitted commands: ${allowed}]`;
    }

    const handler = registry[cmd];
    if (!handler) {
        const available = listRegisteredCommands().join(', ');
        return `[Error: command "${cmd}" is allowed but not registered. Available: ${available}]`;
    }

    // Capture all console output during execution
    const output = [];
    const origWrite = process.stdout.write;
    const origErrWrite = process.stderr.write;
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;

    // ANSI strip regex — remove color codes so agents get clean text
    const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

    process.stdout.write = (chunk) => {
        output.push(stripAnsi(String(chunk)));
        return true;
    };
    process.stderr.write = (chunk) => {
        output.push(stripAnsi(String(chunk)));
        return true;
    };
    console.log = (...a) => {
        output.push(stripAnsi(a.map(String).join(' ')) + '\n');
    };
    console.error = (...a) => {
        output.push(stripAnsi(a.map(String).join(' ')) + '\n');
    };
    console.warn = (...a) => {
        output.push(stripAnsi(a.map(String).join(' ')) + '\n');
    };

    try {
        await handler(args);
    } catch (err) {
        output.push(`[Error: ${err.message}]\n`);
    } finally {
        // Restore originals
        process.stdout.write = origWrite;
        process.stderr.write = origErrWrite;
        console.log = origLog;
        console.error = origError;
        console.warn = origWarn;
    }

    return output.join('').trim() || '(no output)';
}

