#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import { startChat } from './commands/chat.js';
import { showStatus, setDefaultAgent } from './commands/status.js';
import { listAgentNames } from './agents/index.js';
import { listConnectorNames } from './connectors/index.js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// ─── Banner ────────────────────────────────────────────────────────
function showBanner() {
    console.log('');
    console.log(chalk.cyan('   ╔═══════════════════════════════════════╗'));
    console.log(chalk.cyan('   ║') + chalk.bold.white('   🤖  cli-bot  ') + chalk.dim(`v${pkg.version}`) + ' '.repeat(Math.max(0, 21 - pkg.version.length)) + chalk.cyan('║'));
    console.log(chalk.cyan('   ║') + chalk.dim('   Bridge AI agents to your terminal    ') + chalk.cyan('║'));
    console.log(chalk.cyan('   ╚═══════════════════════════════════════╝'));
    console.log('');
}

// ─── Program ───────────────────────────────────────────────────────
const program = new Command();

program
    .name('cli-bot')
    .description('A CLI bot that bridges messaging platforms to AI agents')
    .version(pkg.version)
    .hook('preAction', () => {
        showBanner();
    });

// ─── chat ──────────────────────────────────────────────────────────
program
    .command('chat')
    .description('Start a chat session with an AI agent')
    .option('-a, --agent <name>', 'Agent to use (claude-code, gemini-cli)')
    .option('-p, --prompt <text>', 'Send a single prompt instead of starting a chat loop')
    .option('-i, --interactive', 'Launch the agent\'s own interactive mode')
    .action(async (options) => {
        try {
            await startChat(options.agent, options);
        } catch (err) {
            console.error(chalk.red(`\n  Error: ${err.message}\n`));
            process.exit(1);
        }
    });

// ─── status ────────────────────────────────────────────────────────
program
    .command('status')
    .description('Show agent status and configuration')
    .action(async () => {
        try {
            await showStatus();
        } catch (err) {
            console.error(chalk.red(`\n  Error: ${err.message}\n`));
            process.exit(1);
        }
    });

// ─── config ────────────────────────────────────────────────────────
const configCmd = program
    .command('config')
    .description('Manage cli-bot configuration');

configCmd
    .command('set-agent <name>')
    .description('Set the default AI agent')
    .action((name) => {
        showBanner();
        setDefaultAgent(name);
    });

// ─── agents ────────────────────────────────────────────────────────
program
    .command('agents')
    .description('List available AI agents')
    .action(() => {
        const agents = listAgentNames();
        console.log(chalk.bold('  Available Agents:\n'));
        agents.forEach((a) => {
            console.log(`    ${chalk.green('●')} ${a}`);
        });
        console.log('');
    });

// ─── connectors ────────────────────────────────────────────────────
program
    .command('connectors')
    .description('List available messaging connectors')
    .action(() => {
        const connectors = listConnectorNames();
        if (connectors.length === 0) {
            console.log(chalk.dim('  No connectors installed yet.'));
            console.log(chalk.dim('  Coming soon: whatsapp, telegram\n'));
        } else {
            console.log(chalk.bold('  Available Connectors:\n'));
            connectors.forEach((c) => {
                console.log(`    ${chalk.green('●')} ${c}`);
            });
            console.log('');
        }
    });

// ─── Default action (no command) ───────────────────────────────────
program
    .action(() => {
        showBanner();
        program.help();
    });

program.parse();
