# Available Commands

You can execute any of these commands using the `run_command` tool.

## AI Agents

| Command | Description |
|---|---|
| `claude <prompt>` | Talk to Claude |
| `claude mode <cli\|api>` | Switch Claude CLI/API mode |
| `gemini <prompt>` | Talk to Gemini |
| `gemini mode <cli\|api>` | Switch Gemini CLI/API mode |
| `groq <prompt>` | Send a prompt to Groq (cloud, fast) |
| `groq models` | List available Groq models |
| `groq use <name>` | Switch the active Groq model |
| `groq history` | View Groq conversation history |
| `groq clear` | Reset Groq conversation context |
| `ollama <prompt>` | Chat with Ollama (keeps context) |
| `ollama models` | List downloaded Ollama models |
| `ollama use <name>` | Switch the active Ollama model |
| `ollama pull <name>` | Download an Ollama model |
| `ollama rm <name>` | Remove a local Ollama model |
| `ollama ps` | Show running Ollama models |
| `ollama history` | View Ollama conversation history |
| `ollama clear` | Reset Ollama conversation context |

## WhatsApp

| Command | Description |
|---|---|
| `wa connect` | Connect to WhatsApp (QR code) |
| `wa send <to> <msg>` | Send a WhatsApp message |
| `wa status` | Check WhatsApp connection |
| `wa disconnect` | Disconnect WhatsApp |

## Slack

| Command | Description |
|---|---|
| `slack connect` | Connect to Slack workspace |
| `slack send <ch> <msg>` | Send a message to a channel |
| `slack read <ch> [n]` | Read last N messages from channel |
| `slack channels` | List available channels |
| `slack status` | Check Slack connection |
| `slack disconnect` | Disconnect Slack |

## Telegram

| Command | Description |
|---|---|
| `tg connect` | Connect Telegram bot (polling) |
| `tg send <id> <msg>` | Send a message to a chat |
| `tg chats` | List recent chats |
| `tg status` | Check Telegram bot status |
| `tg disconnect` | Disconnect Telegram bot |

## Ngrok

| Command | Description |
|---|---|
| `ngrok [port]` | Start tunnel (default: 8080) |
| `ngrok status` | Show tunnel info |
| `ngrok stop` | Stop the tunnel |

## System

| Command | Description |
|---|---|
| `folder` | Show current working directory |
| `cd <dir>` | Change current directory |
| `status` | Show all services status |
| `update` | Fetch the latest version from GitHub |
| `theme list` | List available themes |
| `theme <id>` | Set the terminal theme |
