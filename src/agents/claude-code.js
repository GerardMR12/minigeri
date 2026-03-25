import { existsSync, mkdirSync, symlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { BaseAgent } from './base.js';
import { execAgent, execInteractive } from '../executor.js';
import { loadConfig } from '../config.js';

export class ClaudeCodeAgent extends BaseAgent {
    constructor(config = {}) {
        super('claude-code', config);
        this.command = config.command || 'claude';
        this.sessionId = null;
        // null = no workspace context. undefined = not yet evaluated.
        this.sessionContext = undefined;
        this.turnCount = 0;
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

    _parseResponse(stdout, silent) {
        const jsonStart = stdout.indexOf('{');
        if (jsonStart === -1) throw new Error('No JSON found in output');
        const data = JSON.parse(stdout.substring(jsonStart));
        if (data.session_id) this.sessionId = data.session_id;
        this.turnCount++;
        const text = data.result || '';
        if (!silent && text) process.stdout.write(text + '\n');
        return text.trim();
    }

    async send(message, options = {}) {
        const silent = options.silent || false;
        const config = loadConfig();
        const bridgeDir = this._ensureWorkspaceBridge(config);

        // Determine current workspace context key
        const currentContext = (config.activeWorkspace && config.workspaces?.[config.activeWorkspace])
            ? config.activeWorkspace : null;

        // Reset session if workspace context changed
        if (this.sessionContext !== undefined && this.sessionContext !== currentContext) {
            this.sessionId = null;
            this.turnCount = 0;
        }
        this.sessionContext = currentContext;

        const args = ['-p', message, '--dangerously-skip-permissions', '--output-format', 'json'];
        if (this.sessionId) args.push('--resume', this.sessionId);

        const result = await execAgent(this.command, args, {
            env: this._getCleanEnv(),
            cwd: bridgeDir,
            silent: true,
        });

        if (result.code !== 0) {
            // Session may have expired — retry fresh without --resume
            if (this.sessionId) {
                this.sessionId = null;
                this.turnCount = 0;
                const retryArgs = ['-p', message, '--dangerously-skip-permissions', '--output-format', 'json'];
                const retry = await execAgent(this.command, retryArgs, {
                    env: this._getCleanEnv(), cwd: bridgeDir, silent: true,
                });
                if (retry.code !== 0) {
                    throw new Error(`Claude Code exited with code ${retry.code}: ${retry.stderr || retry.stdout}`);
                }
                try { return this._parseResponse(retry.stdout, silent); }
                catch { if (!silent) process.stdout.write(retry.stdout); return retry.stdout.trim(); }
            }
            throw new Error(`Claude Code exited with code ${result.code}: ${result.stderr || result.stdout}`);
        }

        try { return this._parseResponse(result.stdout, silent); }
        catch { if (!silent) process.stdout.write(result.stdout); return result.stdout.trim(); }
    }

    clearHistory() {
        super.clearHistory();
        this.sessionId = null;
        this.sessionContext = undefined;
        this.turnCount = 0;
    }

    getHistoryStats() {
        return { turns: this.turnCount, messages: this.turnCount * 2 };
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
