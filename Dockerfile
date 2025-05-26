# Use official Node.js v22 (LTS) image
FROM node:22-alpine

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Create app directories with proper permissions
RUN mkdir -p /app/uploads /app/frames && \
    chown -R appuser:appgroup /app

# Copy package files
COPY --chown=appuser:appgroup package*.json ./

# Install dependencies
RUN npm install && \
    npm cache clean --force

# Copy source code
COPY --chown=appuser:appgroup . .

# Build the application
RUN npm run build

# Set environment variables
ENV PORT=5000

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "dist/index.js"]
