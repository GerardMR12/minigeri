import chalk from 'chalk';
import readline from 'readline';
import { createAgent, listAgentNames } from '../agents/index.js';
import { getAgent } from '../config.js';

/**
 * Interactive chat loop — talk to an AI agent from the terminal.
 */
export async function startChat(agentName, options = {}) {
    const agentConfig = getAgent(agentName);
    const agent = createAgent(agentConfig.name, agentConfig);

    // Check availability
    const available = await agent.isAvailable();
    if (!available) {
        console.log(chalk.red(`\n  ✗ Agent "${agentConfig.name}" is not available.`));
        console.log(chalk.dim(`    Make sure "${agentConfig.command}" is installed and in your PATH.\n`));
        process.exit(1);
    }

    // If interactive mode requested, hand off to the agent's own REPL
    if (options.interactive) {
        console.log(chalk.cyan(`\n  ⟩ Launching ${agentConfig.name} interactive session...\n`));
        await agent.interactive();
        return;
    }

    // Single prompt mode
    if (options.prompt) {
        const response = await agent.send(options.prompt);
        return;
    }

    // Our own chat loop
    console.log('');
    console.log(chalk.bold.cyan('  ┌──────────────────────────────────────────┐'));
    console.log(chalk.bold.cyan('  │') + chalk.bold('  cli-bot chat                             ') + chalk.bold.cyan('│'));
    console.log(chalk.bold.cyan('  │') + chalk.dim(`  Agent: ${agentConfig.name.padEnd(33)}`) + chalk.bold.cyan('│'));
    console.log(chalk.bold.cyan('  │') + chalk.dim('  Type "exit" or Ctrl+C to quit            ') + chalk.bold.cyan('│'));
    console.log(chalk.bold.cyan('  └──────────────────────────────────────────┘'));
    console.log('');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.green('  you ▸ '),
    });

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (!input) {
            rl.prompt();
            return;
        }

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log(chalk.dim('\n  Goodbye! 👋\n'));
            rl.close();
            return;
        }

        // Switch agent mid-conversation
        if (input.startsWith('/agent ')) {
            const newAgent = input.slice(7).trim();
            const names = listAgentNames();
            if (names.includes(newAgent)) {
                console.log(chalk.yellow(`  Switched to ${newAgent}\n`));
                // Restart with new agent
                rl.close();
                return startChat(newAgent, options);
            } else {
                console.log(chalk.red(`  Unknown agent: ${newAgent}. Available: ${names.join(', ')}\n`));
                rl.prompt();
                return;
            }
        }

        try {
            console.log(chalk.dim('  Thinking...\n'));
            await agent.send(input);
            console.log('');
        } catch (err) {
            console.log(chalk.red(`  Error: ${err.message}\n`));
        }

        rl.prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}
