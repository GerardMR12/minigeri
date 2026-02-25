/**
 * ─── Shared Tool Executor ─────────────────────────────────────────
 *
 * Executes tool calls dispatched by any agent.
 * All tool implementations live here — agents just call executeTool().
 */

import { listProjectFiles, readProjectFile } from '../utils/project-files.js';
import { runCommand } from './command-runner.js';

/**
 * Execute a tool call by name and return the result string.
 *
 * @param {string} name - The tool name (must match a TOOL_CATALOG entry)
 * @param {object} args - Parsed arguments from the model
 * @param {object} [opts] - Options
 * @param {string} [opts.cwd] - Working directory (defaults to process.cwd())
 * @returns {Promise<string>} The tool's text result
 */
export async function executeTool(name, args = {}, opts = {}) {
    const cwd = opts.cwd || process.cwd();

    switch (name) {
        case 'list_files': {
            const files = listProjectFiles(cwd);
            return files.join('\n') || '(no files found)';
        }

        case 'read_file': {
            const path = args.path;
            if (!path) return '[Error: missing "path" argument]';
            return readProjectFile(cwd, path);
        }

        case 'run_command': {
            const command = args.command;
            if (!command) return '[Error: missing "command" argument]';
            return await runCommand(command);
        }

        default:
            return `[Error: unknown tool "${name}"]`;
    }
}

