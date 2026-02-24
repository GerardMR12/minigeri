import chalk from 'chalk';
import { colors, drawBox, icons } from './theme.js';

export function showBanner(version = '1.0.0') {
    const inv = chalk.hex('#10B981'); // Emerald green martian

    const art = `
${colors.primary(' ███╗   ███╗ ██╗ ███╗   ██╗ ██╗  ██████╗  ███████╗ ██████╗  ██╗')}    ${inv('  █         █  ')}
${colors.primary(' ████╗ ████║ ██║ ████╗  ██║ ██║ ██╔════╝  ██╔════╝ ██╔══██╗ ██║')}    ${inv('   █       █   ')}
${colors.highlight(' ██╔████╔██║ ██║ ██╔██╗ ██║ ██║ ██║  ███╗ █████╗   ██████╔╝ ██║')}    ${inv('  ███████████  ')}
${colors.highlight(' ██║╚██╔╝██║ ██║ ██║╚██╗██║ ██║ ██║   ██║ ██╔══╝   ██╔══██╗ ██║')}    ${inv(' ██  █████  ██ ')}
${colors.secondary(' ██║ ╚═╝ ██║ ██║ ██║ ╚████║ ██║ ╚██████╔╝ ███████╗ ██║  ██║ ██║')}    ${inv('███████████████')}
${colors.secondary(' ╚═╝     ╚═╝ ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═╝ ╚═╝')}    ${inv('█  █       █  █')}
`;

    console.log(art);

    const info = drawBox([
        `  ${icons.robot}  ${colors.text('Your AI command center')}                      `,
        `  ${colors.muted(`v${version}`)}                                            `,
        `  ${colors.muted(`Path: ${process.cwd()}`)}`,
        `                                                        `,
        `  ${colors.claude('claude')} ${colors.muted('│')} ${colors.gemini('gemini')} ${colors.muted('│')} ${colors.whatsapp('whatsapp')} ${colors.muted('│')} ${colors.highlight('slack')} ${colors.muted('│')} ${colors.telegram('telegram')} ${colors.muted('│')} ${colors.warning('help')}  `,
    ], 56);

    console.log(info);
    console.log('');
}
