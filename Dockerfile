# Use Node.js 20 slim (LTS)
FROM node:22-slim

# Install system dependencies for Puppeteer only
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    curl \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Add a non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Set working directory
WORKDIR /app

# Create upload and frames directories with proper permissions
RUN mkdir -p /app/uploads /app/frames && \
    chown -R appuser:appgroup /app

# Copy package files and install dependencies
COPY --chown=appuser:appgroup package*.json ./
RUN npm install && npm cache clean --force

# Copy the rest of the application code
COPY --chown=appuser:appgroup . .

# Build the application (if you're using TypeScript or a build step)
RUN npm run build

# Set environment variables
ENV PORT=5000

# Switch to non-root user
USER appuser

# Expose the app port
EXPOSE 5000

# Run the application
CMD ["node", "dist/index.js"]
