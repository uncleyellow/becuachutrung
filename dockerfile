FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Fix permissions and build with explicit path to tsc
RUN chmod +x ./node_modules/.bin/tsc && \
    ./node_modules/.bin/tsc

# Start the application
CMD ["node", "dist/server.js"]