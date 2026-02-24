import { colors, drawBox, icons } from './theme.js';

export function getHelpText() {
    return `🤖 *minigeri messaging help*

*Available commands:*
• \`/gemini [prompt]\` — Talk to Gemini CLI
• \`/claude [prompt]\` — Talk to Claude Code
• \`/folder\` — Show current working directory
• \`/cmd [cmd]\` — Run safe remote commands (cd, mkdir, ls)
• \`help\` — Show this help message

*Examples:*
• \`/gemini What is the capital of France?\`
• \`/claude Suggest 3 names for a cat\``;
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
    console.log(`  ${colors.claude.bold('claude')} ${colors.muted('[prompt]')}       ${colors.text('Talk to Claude Code')}`);
    console.log(`                          ${colors.muted('No prompt → interactive mode')}`);
    console.log(`  ${colors.gemini.bold('gemini')} ${colors.muted('[prompt]')}       ${colors.text('Talk to Gemini CLI')}`);
    console.log(`                          ${colors.muted('No prompt → interactive mode')}`);
    console.log('');

    // ── WhatsApp ──
    console.log(colors.whatsapp.bold('  WhatsApp'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.whatsapp.bold('wa connect')}             ${colors.text('Connect to WhatsApp (QR code)')}`);
    console.log(`  ${colors.whatsapp.bold('wa send')} ${colors.muted('<to> <msg>')}    ${colors.text('Send a WhatsApp message')}`);
    console.log(`  ${colors.whatsapp.bold('wa status')}              ${colors.text('Check WhatsApp connection')}`);
    console.log(`  ${colors.whatsapp.bold('wa disconnect')}          ${colors.text('Disconnect WhatsApp')}`);
    console.log('');

    // ── Slack ──
    console.log(colors.highlight.bold('  Slack'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.highlight.bold('slack connect')}          ${colors.text('Connect to Slack workspace')}`);
    console.log(`  ${colors.highlight.bold('slack send')} ${colors.muted('<ch> <msg>')} ${colors.text('Send a message to a channel')}`);
    console.log(`  ${colors.highlight.bold('slack read')} ${colors.muted('<ch> [n]')}   ${colors.text('Read last N messages from channel')}`);
    console.log(`  ${colors.highlight.bold('slack channels')}         ${colors.text('List available channels')}`);
    console.log(`  ${colors.highlight.bold('slack status')}           ${colors.text('Check Slack connection')}`);
    console.log(`  ${colors.highlight.bold('slack disconnect')}       ${colors.text('Disconnect Slack')}`);
    console.log('');

    // ── Telegram ──
    console.log(colors.telegram.bold('  Telegram'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.telegram.bold('tg connect')}            ${colors.text('Connect Telegram bot (polling)')}`);
    console.log(`  ${colors.telegram.bold('tg send')} ${colors.muted('<id> <msg>')}    ${colors.text('Send a message to a chat')}`);
    console.log(`  ${colors.telegram.bold('tg chats')}              ${colors.text('List recent chats')}`);
    console.log(`  ${colors.telegram.bold('tg status')}             ${colors.text('Check Telegram bot status')}`);
    console.log(`  ${colors.telegram.bold('tg disconnect')}         ${colors.text('Disconnect Telegram bot')}`);
    console.log('');

    // ── System ──
    console.log(colors.accent.bold('  System'));
    console.log(colors.muted('  ─────────────────────────────────────────────'));
    console.log(`  ${colors.accent.bold('folder')}                 ${colors.text('Show current working directory')}`);
    console.log(`  ${colors.accent.bold('cd <dir>')}               ${colors.text('Change current directory')}`);
    console.log(`  ${colors.accent.bold('status')}                 ${colors.text('Show all services status')}`);
    console.log(`  ${colors.accent.bold('help')}                   ${colors.text('Show this help')}`);
    console.log(`  ${colors.accent.bold('clear')}                  ${colors.text('Clear the screen')}`);
    console.log(`  ${colors.accent.bold('exit')}                   ${colors.text('Quit minigeri')}`);
    console.log('');

    // ── Tips ──
    console.log(colors.muted('  💡 Tip: You can also run shell commands with ') + colors.accent('!') + colors.muted(' prefix'));
    console.log(colors.muted('     Example: ') + colors.text('!ls -la') + colors.muted(' or ') + colors.text('!git status'));
    console.log('');
}
