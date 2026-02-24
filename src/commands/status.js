import chalk from 'chalk';
import { loadConfig, saveConfig, getAgent } from '../config.js';
import { createAgent, listAgentNames } from '../agents/index.js';

/**
 * Show current configuration and agent status.
 */
export async function showStatus() {
    const config = loadConfig();

    console.log('');
    console.log(chalk.bold.cyan('  ┌──────────────────────────────────────────┐'));
    console.log(chalk.bold.cyan('  │') + chalk.bold('  cli-bot status                           ') + chalk.bold.cyan('│'));
    console.log(chalk.bold.cyan('  └──────────────────────────────────────────┘'));
    console.log('');

    console.log(chalk.bold('  Default Agent: ') + chalk.green(config.defaultAgent));
    console.log('');

    console.log(chalk.bold('  Agents:'));
    console.log(chalk.dim('  ─────────────────────────────────'));

    const agentNames = listAgentNames();

    for (const name of agentNames) {
        const agentConfig = config.agents[name] || {};
        const agent = createAgent(name, agentConfig);
        const available = await agent.isAvailable();
        const status = available
            ? chalk.green('● available')
            : chalk.red('○ not found');
        const isDefault = name === config.defaultAgent ? chalk.yellow(' (default)') : '';

        console.log(`  ${status}  ${chalk.bold(name)}${isDefault}`);
        if (agentConfig.description) {
            console.log(chalk.dim(`            ${agentConfig.description}`));
        }
        console.log(chalk.dim(`            command: ${agentConfig.command || name}`));
    }

    console.log('');
}

/**
 * Set the default agent.
 */
export function setDefaultAgent(name) {
    const agentNames = listAgentNames();
    if (!agentNames.includes(name)) {
        console.log(chalk.red(`\n  Unknown agent: "${name}". Available: ${agentNames.join(', ')}\n`));
        process.exit(1);
    }
    const config = loadConfig();
    config.defaultAgent = name;
    saveConfig(config);
    console.log(chalk.green(`\n  ✓ Default agent set to "${name}"\n`));
}
