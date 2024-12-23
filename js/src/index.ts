#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import fetch from "node-fetch";

// Interface for parsing AQL REST API response.
interface AqlResponse {
  data: Object;
}

/**
 * Create an MCP server with only tools capability (trigger 'query-data' call).
 */
const server = new Server(
  {
    name: "mcp-agentql",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query-data",
        description: "extract structured data from a given 'url', using 'prompt' as a description of actual data and its fields to extract",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of a webpage to extract data from"
            },
            prompt: {
              type: "string",
              description: "Description of the data to extract from the webpage"
            }
          },
          required: ["url", "prompt"]
        }
      }
    ]
  };
});

/**
 * Handler for the 'query-data' tool.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "query-data": {
      const url = String(request.params.arguments?.url);
      const prompt = String(request.params.arguments?.prompt);
      if (!url || !prompt) {
        throw new Error("'url' and 'prompt' are required");
      }

      const endpoint = "https://api.agentql.com/v1/query-data";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-API-Key": `${process.env.AGENTQL_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: url,
          prompt: prompt,
          params: {
            wait_for: 0,
            is_scroll_to_bottom_enabled: false,
            mode: "fast",
            is_screenshot_enabled: false,
          }
        })
      });
    
      if (!response.ok) {
        throw new Error(`AgentQL API error: ${response.statusText}\n${await response.text()}`);
      }
    
      const json = await response.json() as AqlResponse;

      return {
        content: [{
          type: "text",
          text: JSON.stringify(json.data)
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});


/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
