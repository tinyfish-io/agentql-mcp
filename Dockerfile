FROM node:20-alpine@sha256:16858294071a56ffd4cce9f17b57136cc39e41507b40e245b4f8e906f7a19463

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
