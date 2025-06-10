FROM node:20-alpine@sha256:d3507a213936fe4ef54760a186e113db5188472d9efdf491686bd94580a1c1e8

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
