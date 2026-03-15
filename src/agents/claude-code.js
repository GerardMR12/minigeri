import { existsSync, mkdirSync, symlinkSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';
import { loadConfig } from '../config.js';

export class ClaudeCodeAgent extends BaseAgent {
    constructor(config = {}) {
        super('claude-code', config);
        this.command = config.command || 'claude';
    }

    _getCleanEnv() {
        const env = { ...process.env };
        // Unconditionally remove the API key so Claude Code uses its own auth
        delete env.ANTHROPIC_API_KEY;
        return env;
    }

    /**
     * Creates a temporary bridge directory with symlinks for the active workspace.
     * Claude Code will be launched inside this directory.
     * @private
     */
    _ensureWorkspaceBridge(config) {
        if (!config.activeWorkspace || !config.workspaces?.[config.activeWorkspace]) {
            return process.cwd();
        }

        const workspaceName = config.activeWorkspace;
        const bridgeDir = join(homedir(), '.cli-bot', 'workspaces', workspaceName);

        // Recreate the bridge directory to ensure symlinks are fresh
        if (existsSync(bridgeDir)) {
            try {
                rmSync(bridgeDir, { recursive: true, force: true });
            } catch {}
        }
        mkdirSync(bridgeDir, { recursive: true });

        const workspace = config.workspaces[workspaceName];
        for (const [alias, targetPath] of Object.entries(workspace)) {
            const linkPath = join(bridgeDir, alias);
            try {
                symlinkSync(targetPath, linkPath);
            } catch (err) {
                console.error(`  [Warning] Failed to link ${alias}: ${err.message}`);
            }
        }

        return bridgeDir;
    }

    async send(message, context = {}) {
        const config = loadConfig();
        const bridgeDir = this._ensureWorkspaceBridge(config);

        const args = ['-p', message, '--dangerously-skip-permissions'];

        // Add conversation continuation if available
        if (context.conversationId) {
            args.push('--conversation', context.conversationId);
        }

        const result = await execAgent(this.command, args, { 
            env: this._getCleanEnv(),
            cwd: bridgeDir 
        });

        if (result.code !== 0) {
            throw new Error(`Claude Code exited with code ${result.code}: ${result.stderr || result.stdout}`);
        }

        return result.stdout.trim();
    }

    async interactive() {
        const config = loadConfig();
        const bridgeDir = this._ensureWorkspaceBridge(config);

        return execInteractive(this.command, [], { 
            env: this._getCleanEnv(),
            cwd: bridgeDir
        });
    }

    async isAvailable() {
        try {
            const result = await execAgent(this.command, ['--version'], { env: this._getCleanEnv() });
            return result.code === 0;
        } catch {
            return false;
        }
    }
}
