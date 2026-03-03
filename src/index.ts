#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fetch from 'node-fetch';
import {
  initAgentQL,
  createSession,
  closeSession,
  queryData,
  queryElements,
  closeAll,
} from './sessions.js';

const AGENTQL_API_KEY = process.env.AGENTQL_API_KEY;

if (!AGENTQL_API_KEY) {
  console.error('Error: AGENTQL_API_KEY environment variable is required');
  process.exit(1);
}

initAgentQL(AGENTQL_API_KEY);

const server = new McpServer(
  {
    name: 'agentql-mcp',
    version: '2.0.0',
  },
);

// ---------------------------------------------------------------------------
// Tool: extract-web-data (stateless, REST API)
// ---------------------------------------------------------------------------

server.registerTool(
  'extract-web-data',
  {
    title: 'Extract Web Data',
    description: `Extract structured data from a web page given a URL and a natural language description of what to extract.
This is a STATELESS, one-shot tool — provide a URL and describe the data you want. No browser session needed.
AgentQL navigates to the page, extracts the data, and returns JSON. Best for quick data extraction tasks.

When to use extract-web-data vs create_session + query_data:
- extract-web-data: You have a URL and just want data from that single page. One call, no state. Fast and simple.
- create_session + query_data: You need to BROWSE — navigate across multiple pages, click buttons, fill forms, handle logins, or interact with the page before extracting.

Examples:
  url: "https://example.com/products" prompt: "Get all product names and prices"
  url: "https://news.ycombinator.com" prompt: "Get the top 10 story titles with their points and URLs"`,
    inputSchema: {
      url: z
        .string()
        .describe('The URL of the public webpage to extract data from'),
      prompt: z
        .string()
        .describe('Natural language description of the data to extract from the page'),
    },
  },
  async ({ url, prompt }) => {
    try {
      const endpoint = 'https://api.agentql.com/v1/query-data';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': `${AGENTQL_API_KEY}`,
          'X-TF-Request-Origin': 'mcp-server',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          prompt,
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

      const json = (await response.json()) as { data: object };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(json.data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error extracting data: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: create_session (Tetra cloud browser)
// ---------------------------------------------------------------------------

server.registerTool(
  'create_session',
  {
    title: 'Create Browser Session',
    description: `Provision a remote Tetra cloud browser and return its CDP URL for direct Playwright/CDP connection.
Use this when you need a live browser — to navigate across pages, click buttons, fill forms, or handle auth flows.
After creating a session, connect to the CDP URL with Playwright and use query_data/query_elements for semantic queries.

When to use create_session vs extract-web-data:
- create_session: Multi-step browsing, interaction, or stateful workflows (login → navigate → extract)
- extract-web-data: Single URL, just want data, no interaction needed`,
    inputSchema: {
      profile: z
        .enum(['light', 'stealth'])
        .optional()
        .describe('Browser profile. "stealth" enables anti-detection. Default: "light"'),
      ua_preset: z
        .enum(['windows', 'macos', 'linux'])
        .optional()
        .describe('User agent preset. Ignored when profile is "stealth". Default: "windows"'),
      proxy: z
        .enum(['none', 'tetra', 'custom'])
        .optional()
        .describe('Proxy configuration. Default: "none"'),
      proxy_url: z
        .string()
        .optional()
        .describe('Custom proxy URL. Required when proxy is "custom"'),
    },
  },
  async (params) => {
    try {
      const result = await createSession(params);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error creating session: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: close_session
// ---------------------------------------------------------------------------

server.registerTool(
  'close_session',
  {
    title: 'Close Browser Session',
    description:
      'Close a remote browser session. Disconnects the MCP server\'s CDP connection. If the agent is also disconnected, the Tetra browser is terminated.',
    inputSchema: {
      session_id: z
        .string()
        .describe('Session ID returned by create_session'),
    },
  },
  async ({ session_id }) => {
    try {
      const result = await closeSession(session_id);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error closing session: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: query_data (semantic data extraction from live browser)
// ---------------------------------------------------------------------------

server.registerTool(
  'query_data',
  {
    title: 'Extract Data from Page (Browser Session)',
    description: `Extract structured data from the current page in an active browser session using AgentQL's semantic query language.
Use this when you need to READ information from a page you're browsing — text, numbers, lists, tables.
Returns plain JSON data. Does NOT return element references or selectors.
Requires an active session created with create_session. The agent must have navigated to a page via CDP first.

When to use query_data vs query_elements:
- query_data: "What are the prices on this page?" → returns { price: 99 }
- query_elements: "Where is the checkout button?" → returns { selector: '[tf623_id="42"]' }

When to use query_data vs extract-web-data:
- query_data: You already have a browser session open and need data from the current page
- extract-web-data: You just have a URL and want data in one shot, no session needed

AgentQL query syntax:
- Wrap the entire query in { }
- Field names are SEMANTIC — describe what you want in plain English using snake_case
- AgentQL uses AI to match field names to actual page content (no CSS selectors needed)
- Use [] after a field name to get a list of matching items
- Use (type) to cast values: (integer), (boolean), (string)
- Nest with { } to define structure
- Add a natural language hint in parentheses to disambiguate: price("the discounted price in red")

Examples:
  Single value:    { page_title }
  List:            { headlines[] }
  Nested:          { articles[] { title, author, date } }
  With types:      { products[] { name, price(integer), in_stock(boolean) } }
  Deep nesting:    { search_results[] { title, url, reviews[] { rating(integer), text } } }
  With hints:      { price("the discounted price in red"), original_price("the crossed-out price") }`,
    inputSchema: {
      session_id: z.string().describe('Active session ID'),
      query: z.string().describe('AgentQL query string'),
      include_hidden: z
        .boolean()
        .optional()
        .describe('Include hidden elements. Default: true'),
      mode: z
        .enum(['standard', 'fast'])
        .optional()
        .describe('"standard" for complex queries, "fast" for speed. Default: "fast"'),
      page_index: z
        .number()
        .optional()
        .describe('Page/tab index. Default: 0'),
    },
  },
  async ({ session_id, query, ...options }) => {
    try {
      const result = await queryData(session_id, query, options);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error querying data: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: query_elements (semantic element location from live browser)
// ---------------------------------------------------------------------------

server.registerTool(
  'query_elements',
  {
    title: 'Find Interactive Elements (Browser Session)',
    description: `Locate interactive elements on the page in an active browser session using AgentQL's semantic query language.
Use this when you need to INTERACT with elements — click buttons, fill inputs, follow links.
Returns actionable metadata: CSS selector (usable over CDP), tag, role, name, and attributes.
The returned selector can be used directly with Playwright over CDP: page.click('[tf623_id="42"]')
Requires an active session created with create_session. The agent must have navigated to a page via CDP first.

When to use query_elements vs query_data:
- query_elements: "Find the login button so I can click it" → returns selector you can act on
- query_data: "Extract all product names and prices" → returns plain data, no selectors

AgentQL query syntax:
- Wrap the entire query in { }
- Field names are SEMANTIC — describe the element you're looking for in plain English using snake_case
- AgentQL uses AI to match field names to actual page elements (no CSS selectors needed)
- Use [] after a field name to get a list of matching elements
- Nest with { } to group related elements (e.g. a card with its button)
- Add a natural language hint in parentheses to disambiguate: submit_btn("the blue button at the bottom")

Examples:
  Single element:  { login_btn }
  Multiple:        { search_input, search_btn, menu_toggle }
  List:            { nav_links[] }
  Nested:          { product_cards[] { title, add_to_cart_btn, quantity_input } }
  With hints:      { submit_btn("the blue button at the bottom"), cancel_link("small text below the form") }`,
    inputSchema: {
      session_id: z.string().describe('Active session ID'),
      query: z.string().describe('AgentQL query string'),
      include_hidden: z
        .boolean()
        .optional()
        .describe('Include hidden elements. Default: false'),
      mode: z
        .enum(['standard', 'fast'])
        .optional()
        .describe('"standard" for complex queries, "fast" for speed. Default: "fast"'),
      page_index: z
        .number()
        .optional()
        .describe('Page/tab index. Default: 0'),
    },
  },
  async ({ session_id, query, ...options }) => {
    try {
      const result = await queryElements(session_id, query, options);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error querying elements: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

async function shutdown() {
  console.error('[agentql-mcp] Shutting down, closing all sessions...');
  await closeAll();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[agentql-mcp] Server started (stdio transport)');
