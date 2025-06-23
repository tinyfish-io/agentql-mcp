FROM node:20-alpine@sha256:674181320f4f94582c6182eaa151bf92c6744d478be0f1d12db804b7d59b2d11

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

# Command will be provided by smithery.yaml
CMD ["node", "dist/index.js"]
