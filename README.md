# minigeri 🤖

Your AI command center. A unified terminal interface that lets you talk to AI agents (Claude Code, Gemini CLI), send WhatsApp messages, and interact with Slack — all from one place.

```
     ███╗   ███╗ ██╗ ███╗   ██╗ ██╗  ██████╗  ███████╗ ██████╗  ██╗
     ████╗ ████║ ██║ ████╗  ██║ ██║ ██╔════╝  ██╔════╝ ██╔══██╗ ██║
     ██╔████╔██║ ██║ ██╔██╗ ██║ ██║ ██║  ███╗ █████╗   ██████╔╝ ██║
     ██║╚██╔╝██║ ██║ ██║╚██╗██║ ██║ ██║   ██║ ██╔══╝   ██╔══██╗ ██║
     ██║ ╚═╝ ██║ ██║ ██║ ╚████║ ██║ ╚██████╔╝ ███████╗ ██║  ██║ ██║
     ╚═╝     ╚═╝ ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═╝ ╚═╝
```

---

## Quick Start

```bash
# 1. Clone and install
cd cli-bot
npm install

# 2. Set up your environment
cp .env.example .env
# Edit .env with your tokens (see setup sections below)

# 3. Link the command globally
npm link

# 4. Launch!
minigeri
```

---

## Architecture

```
cli-bot/
├── src/
│   ├── minigeri.js          # Main interactive shell (entry point)
│   ├── index.js             # Legacy Commander.js CLI
│   ├── config.js            # Configuration (~/.cli-bot/config.json)
│   ├── executor.js          # Process spawning for CLI agents
│   ├── agents/              # AI agent integrations
│   │   ├── base.js          #   Abstract base class
│   │   ├── claude-code.js   #   Claude Code wrapper
│   │   ├── gemini-cli.js    #   Gemini CLI wrapper
│   │   └── index.js         #   Agent registry
│   ├── services/            # External service integrations
│   │   ├── whatsapp.js      #   WhatsApp via whatsapp-web.js
│   │   └── slack.js         #   Slack via @slack/web-api
│   ├── connectors/          # Message routing connectors (future)
│   │   ├── base.js          #   Abstract base class
│   │   └── index.js         #   Connector registry
│   └── ui/                  # Terminal UI components
│       ├── theme.js         #   Colors, box drawing, icons
│       ├── banner.js        #   ASCII art banner
│       └── help.js          #   Help screen
├── .env.example             # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Commands Reference

### AI Agents

| Command | Description |
|---|---|
| `claude` | Launch Claude Code in interactive mode |
| `claude <prompt>` | Send a single prompt to Claude Code |
| `gemini` | Launch Gemini CLI in interactive mode |
| `gemini <prompt>` | Send a single prompt to Gemini CLI |

### WhatsApp

| Command | Description |
|---|---|
| `wa connect` | Connect to WhatsApp (shows QR code) |
| `wa send <number> <msg>` | Send a message to a phone number |
| `wa status` | Check WhatsApp connection status |
| `wa disconnect` | Disconnect from WhatsApp |

### Slack

| Command | Description |
|---|---|
| `slack connect` | Connect to Slack workspace |
| `slack send <channel> <msg>` | Post a message to a Slack channel |
| `slack read <channel> [n]` | Read last N messages from a channel |
| `slack channels` | List available channels |
| `slack status` | Check Slack connection status |
| `slack disconnect` | Disconnect from Slack |

### Telegram

| Command | Description |
|---|---|
| `tg connect` | Connect to Telegram bot |
| `tg send <chat_id> <msg>` | Send a message to a chat/user |
| `tg chats` | List recent chats and their IDs |
| `tg status` | Check Telegram connection status |
| `tg disconnect` | Disconnect from Telegram |

### System

| Command | Description |
|---|---|
| `status` | Show all services status |
| `help` | Show help screen |
| `clear` | Clear screen and show banner |
| `!<command>` | Run a shell command (e.g., `!git status`) |
| `exit` | Quit minigeri |

---

## Setup Guide

### 1. AI Agents Setup

#### Claude Code

Claude Code is Anthropic's terminal-based coding agent.

**Install:**
```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Authenticate (opens browser)
claude
```

**What it does in minigeri:**
- `claude` → Opens Claude Code's own interactive REPL. You'll return to minigeri when you type `/exit` in Claude.
- `claude <prompt>` → Sends a single prompt via `claude -p "<prompt>"` and streams the response.

**No API key needed** — Claude Code handles its own authentication.

---

#### Gemini CLI

Gemini CLI is Google's AI assistant for the terminal.

**Install:**
```bash
# Install Gemini CLI globally
npm install -g @anthropic-ai/claude-code  # placeholder — use Google's install method
# Or, if using the Google Cloud SDK:
# gcloud components install gemini-cli

# Verify installation
gemini --version

# Authenticate (uses Google Cloud credentials)
gcloud auth login
```

**What it does in minigeri:**
- `gemini` → Opens Gemini CLI's interactive mode. You'll return to minigeri when you exit.
- `gemini <prompt>` → Sends a single prompt and shows the response.

**No API key needed in `.env`** — Gemini CLI uses your Google Cloud auth.

---

### 2. WhatsApp Setup

minigeri uses [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) to connect to WhatsApp Web. It uses a headless Chromium browser under the hood.

#### Step-by-Step

**Prerequisites:**
- An active WhatsApp account on your phone
- A stable internet connection

**Setup (inside minigeri):**

```
minigeri ▸ wa connect
```

1. Run `wa connect` — a QR code will appear in your terminal.
2. Open WhatsApp on your phone.
3. Go to **Settings → Linked Devices → Link a Device**.
4. Scan the QR code displayed in your terminal.
5. Wait for the "WhatsApp is ready!" message.

**That's it!** The session is persisted in `~/.cli-bot/whatsapp-auth/`, so you won't need to scan again unless you log out.

**Sending messages:**
```
minigeri ▸ wa send 34612345678 Hello from minigeri!
```
- Use the full phone number **with country code** (no `+`, no spaces, no dashes).
- Example for a Spanish number: `34612345678`
- Example for a US number: `14155551234`

**Important notes:**
- WhatsApp Web only allows one linked session besides your phone. If you link a browser, your minigeri session will disconnect.
- The first connection requires scanning the QR code. Subsequent launches will auto-reconnect.
- If you get disconnected, just run `wa connect` again.

---

### 3. Slack Setup

minigeri uses the official [Slack Web API](https://api.slack.com/web) via `@slack/web-api`. You need to create a Slack App to get a Bot Token.

#### Step-by-Step: Creating a Slack App

**1. Go to the Slack API dashboard:**
   - Visit [https://api.slack.com/apps](https://api.slack.com/apps)
   - Click **"Create New App"**
   - Choose **"From scratch"**
   - Name it something like `minigeri-bot`
   - Select your workspace

**2. Add Bot Token Scopes:**
   - In the left sidebar, go to **OAuth & Permissions**
   - Scroll down to **"Scopes" → "Bot Token Scopes"**
   - Add these scopes:

     | Scope | What it's for |
     |---|---|
     | `chat:write` | Sending messages to channels |
     | `channels:read` | Listing public channels |
     | `channels:history` | Reading messages from public channels |
     | `groups:read` | Listing private channels (optional) |
     | `groups:history` | Reading messages from private channels (optional) |
     | `users:read` | Displaying user names when reading messages |

**3. Install the app to your workspace:**
   - Scroll to the top of **OAuth & Permissions**
   - Click **"Install to Workspace"**
   - Click **"Allow"** on the authorization page

**4. Copy the Bot Token:**
   - After install, you'll see **"Bot User OAuth Token"**
   - It starts with `xoxb-`
   - Copy this token

**5. Add the token to your `.env` file:**
   ```env
   SLACK_BOT_TOKEN=xoxb-1234567890-1234567890123-abcdefghijklmnopqrstuvwx
   ```

**6. Invite the bot to channels:**
   - In Slack, go to any channel where you want the bot to post
   - Type: `/invite @minigeri-bot` (or whatever you named it)
   - The bot needs to be in a channel to send messages or read history

#### Using Slack in minigeri

```
# Connect (auto-connects on startup if token is in .env)
minigeri ▸ slack connect

# List channels the bot can see
minigeri ▸ slack channels

# Send a message
minigeri ▸ slack send general Hello from minigeri!

# Read the last 10 messages from a channel
minigeri ▸ slack read general

# Read the last 20 messages
minigeri ▸ slack read general 20

# Check status
minigeri ▸ slack status

# Disconnect
minigeri ▸ slack disconnect
```

**Tips:**
- If `SLACK_BOT_TOKEN` is set in `.env`, Slack auto-connects when minigeri starts.
- You can use either channel names (`general`) or channel IDs (`C1234567890`).
- The bot can only send messages to channels it has been invited to.

---

### 4. Telegram Setup

minigeri uses the official Telegram Bot API via `node-telegram-bot-api`. It polls for messages and displays incoming messages live in your terminal.

#### Step-by-Step: Creating a Telegram Bot

**1. Create the bot on Telegram:**
   - Open Telegram and search for `@BotFather`
   - Send the message `/newbot`
   - Follow the prompts to name your bot and give it a username (must end in `bot`)

**2. Copy the Token:**
   - BotFather will give you a token that looks like this: `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`
   - Copy this token.

**3. Add it to `.env`:**
   ```env
   TELEGRAM_BOT_TOKEN=your-token-here
   ```

#### Using Telegram in minigeri

If the token is in your `.env`, minigeri will auto-connect when you start it and immediately begin listening for messages.

**Waiting for messages:**
Because of how Telegram bots work, **you cannot initiate a conversation with a user**. The user must message your bot first.

1. Open Telegram.
2. Search for your bot's username.
3. Send it a message (e.g., "Hello").
4. In `minigeri`, you will see the incoming message immediately!

```
minigeri ▸
  📩 Telegram DM
     From: your_username (chat: 123456789)
     Hello
```

**Replying / Sending messages:**
```
# List the recent chats the bot knows about
minigeri ▸ tg chats

# Send a message using the chat ID from the previous command
minigeri ▸ tg send 123456789 Hello back!

# Check connection
minigeri ▸ tg status

# Disconnect
minigeri ▸ tg disconnect
```

**Tips:**
- Bots can be added to Telegram groups too. The bot will see messages if it's mentioned or if it's made an admin.
- **AI Agent Triggers**: If a user sends `/gemini <prompt>` or `/claude <prompt>` to your bot, `minigeri` will automatically forward the prompt to the respective AI agent and reply to the user with the generated response!
  > ⚠️ **Warning:** The AI agents are run with auto-approval flags enabled (`-y` for Gemini, `--dangerously-skip-permissions` for Claude) so that they can edit files without getting stuck on confirmation prompts. **Anyone who can message your bot can ask it to execute arbitrary commands or file operations on your machine.** Keep your bot's username private!
- You can send Markdown formatting in your Telegram messages! (e.g., `tg send 1234567 **bold text**`).


---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SLACK_BOT_TOKEN` | For Slack | Slack Bot User OAuth Token (`xoxb-...`) |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Telegram Bot Token (`123456789:ABC...`) |
| `DEFAULT_AGENT` | No | Default AI agent: `claude-code` or `gemini-cli` (default: `claude-code`) |
| `CLAUDE_CODE_PATH` | No | Path to Claude Code binary if not in PATH (default: `claude`) |
| `GEMINI_CLI_PATH` | No | Path to Gemini CLI binary if not in PATH (default: `gemini`) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (for future API-based agents) |
| `GOOGLE_API_KEY` | No | Google AI API key (for future API-based agents) |

WhatsApp doesn't need any environment variables — it authenticates via QR code.

---

## Roadmap

- [x] Interactive shell (`minigeri` command)
- [x] Claude Code integration (interactive + single prompt)
- [x] Gemini CLI integration (interactive + single prompt)
- [x] WhatsApp messaging (via QR code auth)
- [x] Slack messaging (via Bot Token)
- [x] Telegram messaging (via Bot API)
- [ ] Discord connector
- [ ] Incoming message handling (receive & auto-route to AI agents)
- [ ] Conversation history persistence
- [ ] Multi-agent routing (different message types → different agents)
- [ ] Web dashboard for monitoring

---

## Troubleshooting

### WhatsApp QR code not showing
- Make sure you have Chromium/Chrome installed (whatsapp-web.js uses Puppeteer)
- Try: `sudo apt install chromium-browser` (Ubuntu/Debian)
- On headless servers, ensure `--no-sandbox` is used (already configured)

### Slack "not_in_channel" error
- The bot must be invited to the channel first
- In Slack, type `/invite @your-bot-name` in the target channel

### Claude Code "not found"
- Install with: `npm install -g @anthropic-ai/claude-code`
- Or set `CLAUDE_CODE_PATH=/full/path/to/claude` in `.env`

### Gemini CLI "not found"
- Install via Google's instructions for Gemini CLI
- Or set `GEMINI_CLI_PATH=/full/path/to/gemini` in `.env`

---

## License

ISC
