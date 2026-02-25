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
        `  ${colors.muted(`v${version}`)} ${colors.muted(`@ ${process.cwd()}`)}`,
        `                                                        `,
        `  ${chalk.white('Type')} ${colors.claude('claude')}${chalk.white(',')} ${colors.gemini('gemini')}${chalk.white(',')} ${colors.ollama('ollama')} ${chalk.white('or')} ${colors.groq('groq')} ${chalk.white('to talk to AI.')} `,
        `  ${chalk.white('Use with')} ${colors.whatsapp('whatsapp')} ${chalk.white('(')}${colors.whatsapp('wa')}${chalk.white('),')} ${colors.highlight('slack')} ${chalk.white('and')} ${colors.telegram('telegram')} ${chalk.white('(')}${colors.telegram('tg')}${chalk.white(')')}. `,
        `  ${chalk.white('Enter')} ${colors.warning('help')} ${chalk.white('to read the guide.')}                      `,
    ], 56);

    console.log(info);
    console.log('');
}
