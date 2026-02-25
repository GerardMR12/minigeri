#!/bin/bash

# MiniGeri Installer 🤖
# This script installs MiniGeri and its dependencies globally.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Starting MiniGeri installation...${NC}"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
if [ "${NODE_VERSION%%.*}" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version $NODE_VERSION detected. MiniGeri works best with Node.js 18 or higher.${NC}"
fi

# 2. Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. It usually comes with Node.js.${NC}"
    exit 1
fi

# 3. Determine installation directory
INSTALL_DIR="$HOME/.minigeri"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists. Updating existing installation...${NC}"
    cd "$INSTALL_DIR"
    git pull origin main
else
    echo -e "${BLUE}📦 Cloning MiniGeri repository to $INSTALL_DIR...${NC}"
    git clone https://github.com/GerardMR12/minigeri.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 4. Install dependencies
echo -e "${BLUE}⚙️  Installing dependencies (this may take a minute)...${NC}"
npm install --silent

# 5. Set up .env
if [ ! -f ".env" ]; then
    echo -e "${BLUE}📝 Creating .env file from example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Don't forget to edit $INSTALL_DIR/.env with your tokens later!${NC}"
fi

# 6. Link binary globally
echo -e "${BLUE}🔗 Linking minigeri command globally...${NC}"
# Use sudo if permission is denied, but try without first
if ! npm link --silent &> /dev/null; then
    echo -e "${YELLOW}⚠️  Need sudo to link the command globally...${NC}"
    sudo npm link --silent
fi

# 7. Create local storage directory
mkdir -p "$HOME/.cli-bot/whatsapp-auth"

echo -e "
${GREEN}✅ MiniGeri installed successfully!${NC}"
echo -e "You can now run it by typing: ${BLUE}minigeri${NC}"
echo -e "
${YELLOW}Next steps:${NC}"
echo -e "1. Edit your configuration: ${BLUE}nano $INSTALL_DIR/.env${NC}"
echo -e "2. Launch the app: ${BLUE}minigeri${NC}"
echo -e "3. Connect WhatsApp: ${BLUE}minigeri ▸ wa connect${NC}"
