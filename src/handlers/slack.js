import {
    slackConnect, slackSend, slackRead,
    slackChannels, slackStatus, slackDisconnect
} from '../services/slack.js';
import { colors } from '../ui/theme.js';

export async function handleSlack(args) {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
        case 'connect':
            await slackConnect();
            break;

        case 'send': {
            const channel = args[1];
            const message = args.slice(2).join(' ');
            if (!channel || !message) {
                console.log(colors.warning(`  Usage: ${colors.highlight('slack send <channel> <message>')}`));
                console.log(colors.muted('  Example: slack send general Hello team!'));
                return;
            }
            await slackSend(channel, message);
            break;
        }

        case 'read': {
            const channel = args[1];
            const count = parseInt(args[2]) || 10;
            if (!channel) {
                console.log(colors.warning(`  Usage: ${colors.highlight('slack read <channel> [count]')}`));
                console.log(colors.muted('  Example: slack read general 20'));
                return;
            }
            await slackRead(channel, count);
            break;
        }

        case 'channels':
        case 'ch':
            await slackChannels();
            break;

        case 'status':
            slackStatus();
            break;

        case 'disconnect':
            slackDisconnect();
            break;

        default:
            console.log(colors.warning(`  Unknown Slack command: ${subcommand || '(none)'}`));
            console.log(colors.muted('  Available: connect, send, read, channels, status, disconnect'));
            break;
    }
}
