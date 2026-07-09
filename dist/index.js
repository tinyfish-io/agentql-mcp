#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
const server = new Server({
    name: 'agentql-mcp',
    version: '1.0.1',
}, {
    capabilities: {
        tools: {},
    },
});
const EXTRACT_TOOL_NAME = 'extract-web-data';
const SEARCH_TOOL_NAME = 'search-web';
const AGENTQL_API_KEY = process.env.AGENTQL_API_KEY;
const YDC_API_KEY = process.env.YDC_API_KEY;
if (!AGENTQL_API_KEY) {
    console.error('Error: AGENTQL_API_KEY environment variable is required');
    process.exit(1);
}
function buildToolList() {
    const tools = [
        {
            name: EXTRACT_TOOL_NAME,
            description: 'Extracts structured data as JSON from a web page given a URL using a Natural Language description of the data.',
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
    ];
    if (YDC_API_KEY) {
        tools.push({
            name: SEARCH_TOOL_NAME,
            description: 'Searches the web with You.com and returns the top web and news results as JSON.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query to send to You.com',
                    },
                    count: {
                        type: 'number',
                        description: 'Number of results per section to request',
                        default: 10,
                    },
                },
                required: ['query'],
            },
        });
    }
    return tools;
}
async function searchWeb(query, count = 10) {
    const endpoint = new URL('https://ydc-index.io/v1/search');
    endpoint.searchParams.set('query', query);
    endpoint.searchParams.set('count', String(count));
    const response = await fetch(endpoint.toString(), {
        headers: {
            'X-API-Key': `${YDC_API_KEY}`,
        },
        signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
        throw new Error(`You.com API error: ${response.statusText}\n${await response.text()}`);
    }
    return (await response.json());
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: buildToolList() };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case EXTRACT_TOOL_NAME: {
            const rawUrl = request.params.arguments?.url;
            const rawPrompt = request.params.arguments?.prompt;
            if (rawUrl === undefined || rawUrl === null || rawUrl === '' || rawPrompt === undefined || rawPrompt === null || rawPrompt === '') {
                throw new Error("Both 'url' and 'prompt' are required");
            }
            const url = String(rawUrl);
            const prompt = String(rawPrompt);
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
            const json = (await response.json());
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(json.data, null, 2),
                    },
                ],
            };
        }
        case SEARCH_TOOL_NAME: {
            if (!YDC_API_KEY) {
                throw new Error('YDC_API_KEY environment variable is required for search-web');
            }
            const rawQuery = request.params.arguments?.query;
            if (rawQuery === undefined || rawQuery === null || rawQuery === '') {
                throw new Error("'query' is required");
            }
            const query = String(rawQuery);
            const count = Number(request.params.arguments?.count ?? 10);
            const json = await searchWeb(query, Number.isFinite(count) && count > 0 ? count : 10);
            const results = {
                web: json.results?.web ?? [],
                news: json.results?.news ?? [],
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        }
        default:
            throw new Error(`Unknown tool: '${request.params.name}'`);
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
