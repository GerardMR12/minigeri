import { colors, icons } from './theme.js';

export function showTutorial() {
    console.log('');
    console.log(colors.primary.bold('  🎓 minigeri Tutorial'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log('');

    // 1. Core Concept
    console.log(colors.accent.bold('  1. Welcome to minigeri'));
    console.log(colors.text('  minigeri is a CLI bot that bridges messaging platforms to AI agents.'));
    console.log(colors.text('  You can chat with AI models (Claude, Gemini, Groq, local Ollama)'));
    console.log(colors.text('  and connect to messaging apps (Telegram, Slack, WhatsApp).'));
    console.log('');

    // 2. Octopus Mode
    console.log(colors.accent.bold('  2. Octopus Mode (Interactive Chat)'));
    console.log(colors.text('  The easiest way to chat with an AI is Octopus Mode.'));
    console.log(colors.text(`  Just type: ${colors.primary('octopus groq')} (or claude, gemini, ollama).`));
    console.log(colors.text('  Once inside, everything you type goes straight to the AI.'));
    console.log(colors.text(`  Type ${colors.primary('/exit')} to leave and return to minigeri.`));
    console.log('');

    // 3. API Keys and Config
    console.log(colors.accent.bold('  3. Setting up API Keys & Tokens'));
    console.log(colors.text('  To use cloud models or bots, you need to set their keys.'));
    console.log(colors.text('  You only need to do this once. Values are saved locally.'));
    console.log(colors.text(`  ${colors.primary('config list')}              ${colors.muted('— See which keys are set/unset.')}`));
    console.log(colors.text(`  ${colors.primary('config set <KEY> <VAL>')} ${colors.muted('— Set a specific key.')}`));
    console.log(colors.muted('  Example: ') + colors.primary('config set GROQ_API_KEY gsk_12345...'));
    console.log(colors.muted('  Example: ') + colors.primary('config set TELEGRAM_BOT_TOKEN 123456:ABC...'));
    console.log('');

    // 4. Telegram & Slack Bots
    console.log(colors.accent.bold('  4. Connecting to Telegram or Slack'));
    console.log(colors.text('  Once your token is set, you can connect your bot.'));
    console.log(colors.text(`  ${colors.telegram('tg connect')}           ${colors.muted('— Start receiving Telegram messages.')}`));
    console.log(colors.text(`  ${colors.telegram('tg chats')}             ${colors.muted('— List people messaging your bot.')}`));
    console.log(colors.text(`  ${colors.telegram('tg send <id> <msg>')}   ${colors.muted('— Reply to a specific ID.')}`));
    console.log('');

    // 5. Ngrok Tunnels
    console.log(colors.accent.bold('  5. Exposing Local Ports (Ngrok)'));
    console.log(colors.text('  Need to test a webhook or show a local site?'));
    console.log(colors.text(`  ${colors.secondary('ngrok 8080')}           ${colors.muted('— Expose port 8080 to the internet.')}`));
    console.log(colors.text(`  ${colors.secondary('ngrok stop')}           ${colors.muted('— Close the tunnel.')}`));
    console.log('');

    // 6. System Commands
    console.log(colors.accent.bold('  6. Useful System Commands'));
    console.log(colors.text(`  ${colors.primary('status')}                 ${colors.muted('— Check which services are online.')}`));
    console.log(colors.text(`  ${colors.primary('theme <color>')}          ${colors.muted('— Change minigeri\'s look (e.g., theme ocean).')}`));
    console.log(colors.text(`  ${colors.primary('!ls -la')}                ${colors.muted('— Prefix with "!" to run regular shell commands.')}`));
    console.log('');

    console.log(colors.muted(`  ${icons.star} For a full list of commands, type `) + colors.primary('help'));
    console.log('');
}
