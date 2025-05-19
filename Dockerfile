FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the webhook endpoint port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
