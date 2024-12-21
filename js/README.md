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

### For Published Version

1. Create a `~/.npmrc` file with this content:

    ```title="~/.npmrc"
    //npm.pkg.github.com/:_authToken=TOKEN
    @tinyfish-io:registry=https://npm.pkg.github.com
    ```

2. Replace `TOKEN` with your [personal access token (classic)](https://github.com/settings/tokens) using [this guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token).

3. Install the package from private NPM registry:

    ```bash
    npm install -g @tinyfish-io/mcp-agentql
    ```

4. Finally add plugin config to `claude_desktop_config.json` (don't forget to provide actual API key):

    ```json title="claude_desktop_config.json"
    {
      "mcpServers": {
        "agentql": {
          "command": "npx",
          "args": [
            "-y",
            "@tinyfish-io/mcp-agentql"
          ],
          "env": {
            "AGENTQL_API_KEY": "YOU_API_KEY"
          }
        }
      }
    }
    ```

### For Dev Version

```json
{
  "mcpServers": {
    "mcp-agentql": {
      "command": "/path/to/aql-server/js/build/index.js",
      "env": {
        "AGENTQL_API_KEY": "YOU_API_KEY"
      }
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
