import { colors, drawBox } from './theme.js';

export function getHelpText() {
    return `🤖 *minigeri* — your remote AI assistant

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 *AI Agents*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ \`/gemini <prompt>\`  — Google Gemini
🟣 \`/claude <prompt>\`  — Anthropic Claude
🦙 \`/ollama <prompt>\`  — Local Ollama model
⚡ \`/groq <prompt>\`    — Groq (cloud, fast)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ *Tools & Utilities*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 \`/folder\`            — Show working directory
🗂️ \`/workspace <cmd>\`  — Manage workspaces
🌐 \`/ngrok\`             — Start ngrok tunnel
💻 \`/cmd <command>\`     — Run safe shell commands
❓ \`help\`               — Show this message

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *Examples*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`/gemini What is the capital of France?\`
\`/claude Suggest 3 names for a cat\`
\`/cmd ls -la\`
\`/workspace show\``;
}

export function showHelp() {
    console.log('');

    const header = drawBox([
        `  ${colors.text.bold('Available Commands')}                              `,
    ]);
    console.log(header);
    console.log('');

    // ── AI Agents ──
    console.log(colors.primary.bold('  AI Agents'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.claude.bold('claude')} ${colors.muted('<prompt>')}               ${colors.text('Talk to Claude')}`);
    console.log(`  ${colors.gemini.bold('gemini')} ${colors.muted('<prompt>')}               ${colors.text('Talk to Gemini')}`);
    console.log(`  ${colors.ollama.bold('ollama')} ${colors.muted('<prompt>')}               ${colors.text('Chat with Ollama (keeps context)')}`);
    console.log(`  ${colors.groq.bold('groq')} ${colors.muted('<prompt>')}                 ${colors.text('Chat with Groq (cloud, fast)')}`);
    console.log('');

    // ── Octopus Mode ──
    console.log(colors.accent.bold('  Octopus Mode'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.accent.bold('octopus')} ${colors.muted('<agent>')}               ${colors.text('Enter interactive chat mode')}`);
    console.log(colors.muted('  Agents: groq, ollama, claude, gemini'));
    console.log(colors.muted(`  Use ${colors.accent('/exit')} to leave octopus mode`));
    console.log('');

    // ── Claude ──
    console.log(colors.claude.bold('  Claude'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.claude.bold('claude mode')} ${colors.muted('<cli|api>')}         ${colors.text('Switch CLI/API mode')}`);
    console.log('');

    // ── Gemini ──
    console.log(colors.gemini.bold('  Gemini'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.gemini.bold('gemini mode')} ${colors.muted('<cli|api>')}         ${colors.text('Switch CLI/API mode')}`);
    console.log('');

    // ── Groq ──
    console.log(colors.groq.bold('  Groq'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.groq.bold('groq models')}                   ${colors.text('List available models')}`);
    console.log(`  ${colors.groq.bold('groq use')} ${colors.muted('<name>')}               ${colors.text('Switch the active model')}`);
    console.log(`  ${colors.groq.bold('groq history')}                  ${colors.text('View conversation history')}`);
    console.log(`  ${colors.groq.bold('groq clear')}                    ${colors.text('Reset conversation context')}`);
    console.log('');

    // ── Ollama ──
    console.log(colors.ollama.bold('  Ollama'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.ollama.bold('ollama models')}                 ${colors.text('List downloaded models')}`);
    console.log(`  ${colors.ollama.bold('ollama use')} ${colors.muted('<name>')}             ${colors.text('Switch the active model')}`);
    console.log(`  ${colors.ollama.bold('ollama pull')} ${colors.muted('<name>')}            ${colors.text('Download a model')}`);
    console.log(`  ${colors.ollama.bold('ollama rm')} ${colors.muted('<name>')}              ${colors.text('Remove a local model')}`);
    console.log(`  ${colors.ollama.bold('ollama ps')}                     ${colors.text('Show running models')}`);
    console.log(`  ${colors.ollama.bold('ollama history')}                ${colors.text('View conversation history')}`);
    console.log(`  ${colors.ollama.bold('ollama clear')}                  ${colors.text('Reset conversation context')}`);
    console.log('');

    // ── WhatsApp ──
    console.log(colors.whatsapp.bold('  WhatsApp'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.whatsapp.bold('wa connect')}                    ${colors.text('Connect to WhatsApp (QR code)')}`);
    console.log(`  ${colors.whatsapp.bold('wa send')} ${colors.muted('<to> <msg>')}            ${colors.text('Send a WhatsApp message')}`);
    console.log(`  ${colors.whatsapp.bold('wa status')}                     ${colors.text('Check WhatsApp connection')}`);
    console.log(`  ${colors.whatsapp.bold('wa disconnect')}                 ${colors.text('Disconnect WhatsApp')}`);
    console.log('');

    // ── Slack ──
    console.log(colors.highlight.bold('  Slack'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.highlight.bold('slack connect')}                 ${colors.text('Connect to Slack workspace')}`);
    console.log(`  ${colors.highlight.bold('slack send')} ${colors.muted('<ch> <msg>')}         ${colors.text('Send a message to a channel')}`);
    console.log(`  ${colors.highlight.bold('slack read')} ${colors.muted('<ch> [n]')}           ${colors.text('Read last N messages from channel')}`);
    console.log(`  ${colors.highlight.bold('slack channels')}                ${colors.text('List available channels')}`);
    console.log(`  ${colors.highlight.bold('slack status')}                  ${colors.text('Check Slack connection')}`);
    console.log(`  ${colors.highlight.bold('slack disconnect')}              ${colors.text('Disconnect Slack')}`);
    console.log('');

    // ── Telegram ──
    console.log(colors.telegram.bold('  Telegram'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.telegram.bold('tg connect')}                    ${colors.text('Connect Telegram bot (polling)')}`);
    console.log(`  ${colors.telegram.bold('tg send')} ${colors.muted('<id> <msg>')}            ${colors.text('Send a message to a chat')}`);
    console.log(`  ${colors.telegram.bold('tg chats')}                      ${colors.text('List recent chats')}`);
    console.log(`  ${colors.telegram.bold('tg status')}                     ${colors.text('Check Telegram bot status')}`);
    console.log(`  ${colors.telegram.bold('tg disconnect')}                 ${colors.text('Disconnect Telegram bot')}`);
    console.log('');

    // ── Ngrok ──
    console.log(colors.secondary.bold('  Ngrok'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.secondary.bold('ngrok')} ${colors.muted('[port]')}                  ${colors.text('Start tunnel (default: 8080)')}`);
    console.log(`  ${colors.secondary.bold('ngrok status')}                  ${colors.text('Show tunnel info')}`);
    console.log(`  ${colors.secondary.bold('ngrok stop')}                    ${colors.text('Stop the tunnel')}`);
    console.log('');

    // ── Workspaces ──
    console.log(colors.primary.bold('  Workspaces (Virtual)'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.primary.bold('workspace show')}                ${colors.text('List all workspaces and their paths')}`);
    console.log(`  ${colors.primary.bold('workspace create')} ${colors.muted('<n>')}         ${colors.text('Create a new named workspace')}`);
    console.log(`  ${colors.primary.bold('workspace add')} ${colors.muted('<a> <p>')}        ${colors.text('Add a path with an alias to current workspace')}`);
    console.log(`  ${colors.primary.bold('workspace activate')} ${colors.muted('<n>')}       ${colors.text('Switch to a specific workspace')}`);
    console.log(`  ${colors.primary.bold('workspace deactivate')}           ${colors.text('Deactivate current workspace')}`);
    console.log(`  ${colors.primary.bold('workspace remove')} ${colors.muted('<n>')}         ${colors.text('Delete a workspace')}`);
    console.log('');

    // ── System ──
    console.log(colors.accent.bold('  System'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.accent.bold('theme list')}                    ${colors.text('List available themes')}`);
    console.log(`  ${colors.accent.bold('theme <id>')}                    ${colors.text('Set the terminal theme')}`);
    console.log(`  ${colors.accent.bold('tutorial')}                      ${colors.text('Learn how to use minigeri')}`);
    console.log(`  ${colors.accent.bold('config list')}                   ${colors.text('Show all API keys and their status')}`);
    console.log(`  ${colors.accent.bold('config set')} ${colors.muted('<k> <v>')}             ${colors.text('Set an API key or token')}`);
    console.log(`  ${colors.accent.bold('update')}                        ${colors.text('Fetch the latest version from GitHub')}`);
    console.log(`  ${colors.accent.bold('reinstall')}                     ${colors.text('Run the installation script to reset/update')}`);
    console.log(`  ${colors.accent.bold('uninstall')}                     ${colors.text('Completely remove minigeri from this machine')}`);
    console.log(`  ${colors.accent.bold('folder')}                        ${colors.text('Show current working directory')}`);
    console.log(`  ${colors.accent.bold('cd <dir>')}                      ${colors.text('Change current directory')}`);
    console.log(`  ${colors.accent.bold('status')}                        ${colors.text('Show all services status')}`);
    console.log(`  ${colors.accent.bold('help')}                          ${colors.text('Show this help')}`);
    console.log(`  ${colors.accent.bold('clear')}                         ${colors.text('Clear the screen')}`);
    console.log(`  ${colors.accent.bold('exit')}                          ${colors.text('Quit minigeri')}`);
    console.log('');

    // ── Tips ──
    console.log(colors.muted('  💡 Tip: You can also run shell commands with ') + colors.accent('!') + colors.muted(' prefix'));
    console.log(colors.muted('     Example: ') + colors.text('!ls -la') + colors.muted(' or ') + colors.text('!git status'));
    console.log('');
}
