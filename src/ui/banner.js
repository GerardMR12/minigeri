import chalk from 'chalk';
import { colors, drawBox, icons } from './theme.js';

export function showBanner(version = '1.0.0') {
    const art = `
${colors.primary(' ███╗   ███╗ ██╗ ███╗   ██╗ ██╗  ██████╗  ███████╗ ██████╗  ██╗')}    ${colors.invader('  █         █  ')}
${colors.primary(' ████╗ ████║ ██║ ████╗  ██║ ██║ ██╔════╝  ██╔════╝ ██╔══██╗ ██║')}    ${colors.invader('   █       █   ')}
${colors.highlight(' ██╔████╔██║ ██║ ██╔██╗ ██║ ██║ ██║  ███╗ █████╗   ██████╔╝ ██║')}    ${colors.invader('  ███████████  ')}
${colors.highlight(' ██║╚██╔╝██║ ██║ ██║╚██╗██║ ██║ ██║   ██║ ██╔══╝   ██╔══██╗ ██║')}    ${colors.invader(' ██  █████  ██ ')}
${colors.secondary(' ██║ ╚═╝ ██║ ██║ ██║ ╚████║ ██║ ╚██████╔╝ ███████╗ ██║  ██║ ██║')}    ${colors.invader('███████████████')}
${colors.secondary(' ╚═╝     ╚═╝ ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═╝ ╚═╝')}    ${colors.invader('█  █       █  █')}
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
