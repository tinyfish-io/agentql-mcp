FROM node:20-alpine@sha256:8bda036ddd59ea51a23bc1a1035d3b5c614e72c01366d989f4120e8adca196d4

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Environment variables
ENV AGENTQL_API_KEY=your-api-key

# Drop root: the node base image ships a non-privileged `node` user (uid 1000).
# The build artifacts under /app are world-readable, so the runtime only needs
# read access — no chown required.
USER node

# Command will be provided by smithery.yaml
CMD ["node", "dist/index.js"]
