#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Interface for parsing AQL REST API response.
interface AqlResponse {
  data: object;
}

// Create an MCP server with only tools capability (trigger 'query-data' call).
const server = new Server(
  {
    name: 'agentql-mcp',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const EXTRACT_TOOL_NAME = 'extract-web-data';
const AGENTQL_API_KEY = process.env.AGENTQL_API_KEY;

if (!AGENTQL_API_KEY) {
  console.error('Error: AGENTQL_API_KEY environment variable is required');
  process.exit(1);
}

// Handler that lists available tools.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: EXTRACT_TOOL_NAME,
        description:
          'Extracts structured data as JSON from a web page given a URL using a Natural Language description of the data.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the public webpage to extract data from',
            },
            prompt: {
              type: 'string',
              description: 'Natural Language description of the data to extract from the page',
            },
          },
          required: ['url', 'prompt'],
        },
      },
    ],
  };
});

// Handler for the 'extract-web-data' tool.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case EXTRACT_TOOL_NAME: {
      const url = String(request.params.arguments?.url);
      const prompt = String(request.params.arguments?.prompt);
      if (!url || !prompt) {
        throw new Error("Both 'url' and 'prompt' are required");
      }

      const endpoint = 'https://api.agentql.com/v1/query-data';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': `${AGENTQL_API_KEY}`,
          'X-TF-Request-Origin': 'mcp-server',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          prompt: prompt,
          params: {
            wait_for: 0,
            is_scroll_to_bottom_enabled: false,
            mode: 'fast',
            is_screenshot_enabled: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AgentQL API error: ${response.statusText}\n${await response.text()}`);
      }

      const json = (await response.json()) as AqlResponse;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(json.data, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: '${request.params.name}'`);
  }
});

// Start the server using stdio transport.
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
