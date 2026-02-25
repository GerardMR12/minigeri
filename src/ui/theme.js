import chalk from 'chalk';

// ─── Color Palette ─────────────────────────────────────────────────
export const palettes = {
    default: {
        primary: '#7C3AED',   // Purple
        secondary: '#06B6D4',   // Cyan
        accent: '#F59E0B',   // Amber
        success: '#10B981',   // Green
        error: '#EF4444',   // Red
        warning: '#F97316',   // Orange
        muted: '#6B7280',   // Gray
        text: '#E5E7EB',   // Light gray
        highlight: '#A78BFA',   // Light purple
        invader: '#10B981',   // Emerald green martian
        whatsapp: '#25D366',   // WhatsApp green
        claude: '#D97706',   // Claude amber
        gemini: '#4285F4',   // Gemini blue
        ollama: '#525252',   // Ollama dark gray
        slack: '#4A154B',   // Slack aubergine
        telegram: '#0088CC',   // Telegram blue
    },
    ocean: {
        primary: '#0369A1',   // Deep Blue
        secondary: '#0EA5E9', // Light Blue
        accent: '#38BDF8',    // Sky Blue
        success: '#10B981',
        error: '#EF4444',
        warning: '#F97316',
        muted: '#9CA3AF',
        text: '#F3F4F6',
        highlight: '#BAE6FD',
        invader: '#0284C7',
        whatsapp: '#25D366',
        claude: '#D97706',
        gemini: '#4285F4',
        ollama: '#525252',
        slack: '#4A154B',
        telegram: '#0088CC',
    },
    forest: {
        primary: '#166534',   // Deep Green
        secondary: '#22C55E', // Green
        accent: '#84CC16',    // Lime
        success: '#10B981',
        error: '#EF4444',
        warning: '#F97316',
        muted: '#9CA3AF',
        text: '#F3F4F6',
        highlight: '#BBF7D0',
        invader: '#4ADE80',
        whatsapp: '#25D366',
        claude: '#D97706',
        gemini: '#4285F4',
        ollama: '#525252',
        slack: '#4A154B',
        telegram: '#0088CC',
    },
    cyberpunk: {
        primary: '#D946EF',   // Fuchsia
        secondary: '#06B6D4', // Cyan
        accent: '#EAB308',    // Yellow
        success: '#10B981',
        error: '#EF4444',
        warning: '#F97316',
        muted: '#6B7280',
        text: '#E5E7EB',
        highlight: '#F0ABFC',
        invader: '#e27ad4ff',
        whatsapp: '#25D366',
        claude: '#D97706',
        gemini: '#4285F4',
        ollama: '#525252',
        slack: '#4A154B',
        telegram: '#0088CC',
    },
    dracula: {
        primary: '#BD93F9',
        secondary: '#8BE9FD',
        accent: '#FFB86C',
        success: '#50FA7B',
        error: '#FF5555',
        warning: '#F1FA8C',
        muted: '#6272A4',
        text: '#F8F8F2',
        highlight: '#FF79C6',
        invader: '#c07dc9ff',
        whatsapp: '#25D366',
        claude: '#D97706',
        gemini: '#4285F4',
        ollama: '#525252',
        slack: '#4A154B',
        telegram: '#0088CC',
    }
};

export const colors = {};

export function setTheme(themeId) {
    const palette = palettes[themeId] || palettes.default;
    for (const [key, hex] of Object.entries(palette)) {
        colors[key] = chalk.hex(hex);
    }
}

// Initialize default colors
setTheme('default');

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
    llama: '🦙',
    phone: '📱',
    send: '📤',
    rocket: '🚀',
    key: '🔑',
    link: '🔗',
    warning: '⚠️',
};
