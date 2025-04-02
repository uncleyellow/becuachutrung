FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install

# Copy source files
COPY . .

# Build the app (compile TypeScript)
RUN npm run build

# Start the app
CMD ["npm", "start"]