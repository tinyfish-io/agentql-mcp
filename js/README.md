# mcp-agentql MCP Server

An MCP server to work with AgentQL

This is a TypeScript-based MCP server that implements triggering AgentQL REST API.

## Features

### Tools
- `query-data` - extract structured data from a given 'url', using 'prompt' as a description of actual data and its fields to extract

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-agentql": {
      "command": "/path/to/aql-server/js/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
