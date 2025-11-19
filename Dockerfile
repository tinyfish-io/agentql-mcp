FROM node:20-alpine@sha256:6178e78b972f79c335df281f4b7674a2d85071aae2af020ffa39f0a770265435

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
