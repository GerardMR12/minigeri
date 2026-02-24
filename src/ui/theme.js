import chalk from 'chalk';

// ─── Color Palette ─────────────────────────────────────────────────
export const colors = {
    primary: chalk.hex('#7C3AED'),   // Purple
    secondary: chalk.hex('#06B6D4'),   // Cyan
    accent: chalk.hex('#F59E0B'),   // Amber
    success: chalk.hex('#10B981'),   // Green
    error: chalk.hex('#EF4444'),   // Red
    warning: chalk.hex('#F97316'),   // Orange
    muted: chalk.hex('#6B7280'),   // Gray
    text: chalk.hex('#E5E7EB'),   // Light gray
    highlight: chalk.hex('#A78BFA'),   // Light purple
    whatsapp: chalk.hex('#25D366'),   // WhatsApp green
    claude: chalk.hex('#D97706'),   // Claude amber
    gemini: chalk.hex('#4285F4'),   // Gemini blue
    slack: chalk.hex('#4A154B'),   // Slack aubergine
    telegram: chalk.hex('#0088CC'),   // Telegram blue
};

// ─── Box Drawing ───────────────────────────────────────────────────
export const box = {
    tl: '╭', tr: '╮', bl: '╰', br: '╯',
    h: '─', v: '│',
    ltee: '├', rtee: '┤',
};

export function drawBox(lines, width = 54) {
    const top = colors.primary(`  ${box.tl}${'─'.repeat(width)}${box.tr}`);
    const bot = colors.primary(`  ${box.bl}${'─'.repeat(width)}${box.br}`);

    const rows = lines.map((line) => {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        const padding = Math.max(0, width - stripped.length);
        return colors.primary(`  ${box.v}`) + line + ' '.repeat(padding) + colors.primary(box.v);
    });

    return [top, ...rows, bot].join('\n');
}

// ─── Status Indicators ────────────────────────────────────────────
export const icons = {
    bullet: '●',
    circle: '○',
    arrow: '▸',
    check: '✓',
    cross: '✗',
    star: '★',
    dot: '·',
    dash: '─',
    spark: '⚡',
    gear: '⚙',
    chat: '💬',
    robot: '🤖',
    phone: '📱',
    send: '📤',
    rocket: '🚀',
    key: '🔑',
    link: '🔗',
    warning: '⚠️',
};
