# Use the official lightweight Bun image
FROM oven/bun:alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies first (for caching layers)
COPY package.json bun.lock ./
RUN bun install --production

# Copy source code and schemas
COPY tsconfig.json ./
COPY server.ts ./
COPY llm/ ./llm/
COPY src/ ./src/

# Expose port (default 3001)
EXPOSE 3001

# Run the server
CMD ["bun", "run", "server.ts"]
