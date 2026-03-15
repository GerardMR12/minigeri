import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';
import { loadConfig } from '../config.js';
import { tmpdir } from 'os';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Dedicated empty directory used as a neutral CWD when virtual workspace is active.
// Gemini CLI will see nothing here — only the --include-directories folders.
const NEUTRAL_CWD = join(tmpdir(), '.minigeri-workspace');
try { mkdirSync(NEUTRAL_CWD, { recursive: true }); } catch { /* already exists */ }

export class GeminiCliAgent extends BaseAgent {
    constructor(config = {}) {
        super('gemini-cli', config);
        this.command = config.command || 'gemini';
        this.sessionId = null;
        // Tracks the workspace context the current session was started under.
        // null means no workspace (standard mode). undefined = never set yet.
        this.sessionContext = undefined;
    }

    async send(message, options = {}) {
        const silent = options.silent || false;
        const config = loadConfig();

        // Determine the current workspace context key (name or null for no workspace)
        const currentContext = (config.activeWorkspace && config.workspaces?.[config.activeWorkspace])
            ? config.activeWorkspace
            : null;

        // If the workspace context changed since the last session, start fresh.
        // This avoids "Invalid session identifier" errors when switching workspaces.
        if (this.sessionContext !== undefined && this.sessionContext !== currentContext) {
            this.sessionId = null;
        }
        this.sessionContext = currentContext;

        // Build args: --yolo (auto-accept all actions), JSON output for session ID capture
        const args = ['--yolo', '--output-format', 'json'];

        // When a virtual workspace is active, run gemini from a dedicated empty
        // temp dir so it sees nothing from the CWD — no matter what directory
        // minigeri is in or what the user has cd'd to inside the session.
        // Only the explicitly included workspace directories will be visible.
        let spawnCwd = undefined;
        if (currentContext) {
            const dirs = Object.values(config.workspaces[currentContext]);
            for (const dir of dirs) {
                args.push('--include-directories', dir);
            }
            // Use a dedicated empty temp dir as CWD so Gemini sees nothing
            // from the working directory — only the --include-directories folders.
            spawnCwd = NEUTRAL_CWD;
        }

        if (this.sessionId) {
            args.push('--resume', this.sessionId);
        }

        // -p/--prompt must come last to avoid clashing with positional args
        args.push('-p', message);

        const result = await execAgent(this.command, args, { silent: true, cwd: spawnCwd });

        if (result.code !== 0) {
            throw new Error(`Gemini CLI exited with code ${result.code}: ${result.stderr || result.stdout}`);
        }

        try {
            // Find the JSON block in stdout (it might have preamble logs like YOLO mode enabled)
            const stdout = result.stdout;
            const jsonStart = stdout.indexOf('{');
            if (jsonStart === -1) throw new Error('No JSON found in output');
            
            const data = JSON.parse(stdout.substring(jsonStart));
            
            // Save session ID for next turn
            if (data.session_id) {
                this.sessionId = data.session_id;
            }

            const text = data.response || '';
            
            // If not silent, print the response manually since we suppressed it in execAgent
            if (!silent && text) {
                process.stdout.write(text + '\n');
            }

            return text.trim();
        } catch (err) {
            // Fallback: if JSON fails, return raw stdout but it might be messy
            if (!silent) process.stdout.write(result.stdout);
            return result.stdout.trim();
        }
    }

    async interactive() {
        const config = loadConfig();
        const args = ['--yolo'];
        let spawnCwd = undefined;
        if (config.activeWorkspace && config.workspaces?.[config.activeWorkspace]) {
            const dirs = Object.values(config.workspaces[config.activeWorkspace]);
            for (const dir of dirs) {
                args.push('--include-directories', dir);
            }
            // Use a dedicated empty temp dir as CWD so Gemini sees nothing
            // from the working directory — only the --include-directories folders.
            spawnCwd = NEUTRAL_CWD;
        }
        return execInteractive(this.command, args, { cwd: spawnCwd });
    }

    async isAvailable() {
        try {
            const result = await execAgent(this.command, ['--version']);
            return result.code === 0;
        } catch {
            return false;
        }
    }
}
