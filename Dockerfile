# MiniGeri Dockerfile 🤖
# This allows running minigeri in an isolated container.

FROM node:20-slim

# Install dependencies for WhatsApp Web (headless Chromium)
RUN apt-get update && apt-get install -y 
    chromium 
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 
    --no-install-recommends 
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Create the data directory
RUN mkdir -p /root/.cli-bot/whatsapp-auth

# Link the command
RUN npm link

# Default command
CMD [ "minigeri" ]
